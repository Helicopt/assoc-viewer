// @ts-check


// This script is run within the webview itself
(function () {
    // @ts-ignore
    const vscode = acquireVsCodeApi();

    /**
     * A drawn line.
     */
    class Stroke {
        constructor(/** @type {string} */ color, /** @type {Array<[number, number]> | undefined} */ stroke) {
            this.color = color;
            /** @type {Array<[number, number]>} */
            this.stroke = stroke || [];
        }

        addPoint(/** @type {number} */ x, /** @type {number} */ y) {
            this.stroke.push([x, y]);
        }
    }

    /**
     * @param {Uint8Array} initialContent 
     * @return {Promise<JSON>}
     */
    async function loadFromData(initialContent) {
        const jsonString = new TextDecoder().decode(initialContent);
        const obj = JSON.parse(jsonString);
        // console.log(obj);
        return obj;
    }

    class PawDrawEditor {
        constructor( /** @type {HTMLElement} */ parent) {
            this.ready = false;

            this.editable = false;

            this.drawingColor = 'black';

            /** @type {Array<Stroke>} */
            this.strokes = [];

            this.srcData = JSON.parse('{"initialized": false}');

            this.ptr = 0;
            this.dataLen = 1;
            this.evalPhase = 'default';

            /** @type {Stroke | undefined} */
            this.currentStroke = undefined;

            this._initElements(parent);
        }

        addPoint(/** @type {number} */ x, /** @type {number} */ y) {
            if (this.currentStroke) {
                this.currentStroke.addPoint(x, y);
            }
        }

        beginStoke(/** @type {string} */ color) {
            this.currentStroke = new Stroke(color);
            this.strokes.push(this.currentStroke);
        }

        endStroke() {
            const previous = this.currentStroke;
            this.currentStroke = undefined;
            return previous;
        }

        setEditable(editable) {
            this.editable = editable;
            const colorButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.drawing-controls button'));
            for (const colorButton of colorButtons) {
                colorButton.disabled = !editable;
            }
        }

        _initElements(/** @type {HTMLElement} */ parent) {
            // const colorButtons = /** @type {NodeListOf<HTMLButtonElement>} */ (document.querySelectorAll('.drawing-controls button'));
            // for (const colorButton of colorButtons) {
            //     colorButton.addEventListener('click', e => {
            //         e.stopPropagation();
            //         colorButtons.forEach(button => button.classList.remove('active'));
            //         colorButton.classList.add('active');
            //         this.drawingColor = colorButton.dataset['color'];
            //     });
            // }

            this.wrapper = document.createElement('div');
            this.wrapper.style.position = 'relative';
            this.wrapper.style.display = 'flex';
            this.wrapper.style.flexDirection = 'column';
            parent.append(this.wrapper);

            this.text = document.createElement('p');
            this.text.style.order = '1';
            this.text.textContent = 'loading...';
            this.wrapper.append(this.text);

            // this.initialCanvas = document.createElement('canvas');
            // this.initialCtx = this.initialCanvas.getContext('2d');
            // this.wrapper.append(this.initialCanvas);

            this.drawingCanvas = document.createElement('canvas');
            this.drawingCanvas.style.order = '3';
            const neededW = 600;
            const neededH = 300;
            this.drawingCanvas.width = neededW;
            this.drawingCanvas.height = neededH;
            // this.drawingCanvas.style.position = 'absolute';
            // this.drawingCanvas.style.top = '0';
            // this.drawingCanvas.style.left = '0';

            this.controlDiv = document.createElement('div');
            this.controlDiv.style.display = 'flex';
            this.controlDiv.style.order = '2';
            this.controlDiv.style.alignContent = 'center';
            this.controlDiv.style.position = 'relative';
            this.controlDiv.style.width = '100%';
            this.wrapper.append(this.controlDiv);

            this.drawingCtx = this.drawingCanvas.getContext('2d');
            this.drawingCtx.fillStyle = 'white';
            this.drawingCtx.fillRect(0, 0, neededW, neededH);
            this.drawingCanvas.style.order = '2';
            this.wrapper.append(this.drawingCanvas);



            this.prevButton = document.createElement('button');
            this.prevButton.style.float = 'left';
            this.prevButton.style.width = '50%';
            this.prevButton.style.order = '1';
            this.prevButton.textContent = 'Prev';
            this.prevButton.addEventListener('click', e => {
                e.stopPropagation();
                this.ptr -= 1;
                if (this.ptr < 0) {
                    this.ptr = 0;
                }
                if (this.ptr >= this.dataLen) {
                    this.ptr = this.dataLen - 1;
                }
                this.reset(this.srcData, false);
            });
            this.controlDiv.append(this.prevButton);
            this.nextButton = document.createElement('button');
            this.nextButton.style.float = 'left';
            this.nextButton.style.width = '50%';
            this.nextButton.style.order = '2';
            this.nextButton.textContent = 'Next';
            this.nextButton.addEventListener('click', e => {
                e.stopPropagation();
                this.ptr += 1;
                if (this.ptr < 0) {
                    this.ptr = 0;
                }
                if (this.ptr >= this.dataLen) {
                    this.ptr = this.dataLen - 1;
                }
                this.reset(this.srcData, false);
            });
            this.controlDiv.append(this.nextButton);

            // let isDrawing = false;

            // parent.addEventListener('mousedown', () => {
            //     if (!this.ready || !this.editable) {
            //         return;
            //     }

            //     this.beginStoke(this.drawingColor);
            //     this.drawingCtx.strokeStyle = this.drawingColor;

            //     isDrawing = true;
            //     document.body.classList.add('isDrawing');
            //     this.drawingCtx.beginPath();
            // });

            // document.body.addEventListener('mouseup', async () => {
            //     if (!isDrawing || !this.ready || !this.editable) {
            //         return;
            //     }

            //     isDrawing = false;
            //     document.body.classList.remove('isDrawing');
            //     this.drawingCtx.closePath();

            //     const edit = this.endStroke();

            //     if (edit.stroke.length) {
            //         vscode.postMessage({
            //             type: 'stroke',
            //             color: edit.color,
            //             stroke: edit.stroke,
            //         });
            //     }
            // });

            // parent.addEventListener('mousemove', e => {
            //     if (!isDrawing || !this.ready || !this.editable) {
            //         return;
            //     }
            //     const rect = this.wrapper.getBoundingClientRect();
            //     const x = e.clientX - rect.left;
            //     const y = e.clientY - rect.top;
            //     this.drawingCtx.lineTo(x, y);
            //     this.drawingCtx.stroke();
            //     this.addPoint(x, y);
            // });
        }

        /**
         * 
         * @param {number} i 
         * @param {number} j 
         * @param {Array<Float32Array>} ious 
         * @param {Array<Float32Array>} dis 
         * @param {Array<Float32Array>} sims 
         * @returns 
         */
        formatinfo(i, j, ious, dis, sims) {
            var info = 'not found';
            if (i >= 0 && j >= 0) {
                info =
                    '  i:' + ious[i][j].toFixed(2).toString() +
                    '  d:' + dis[i][j].toFixed(2).toString() +
                    '  s:' + sims[i][j].toFixed(2).toString();
            }
            return info;
        }

        /**
         * 
         * @param {string} evalPhase
         * @param {number} iou 
         * @param {number} dis 
         * @param {number} sim 
         * @returns 
         */
        predict(evalPhase, iou, dis, sim) {
            if (evalPhase !== 'default') {
                try {
                    var pred = true;
                    return pred;
                } catch {

                }
            }
            if (iou > 0.5) { return true; }
            if (iou < 0.1) { return false; }
            if (sim > 0.8) { return true; }
            return false;
        }

        _redraw() {
            if (!this.ready) {
                return;
            }
            this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
            // for (const stroke of this.strokes) {
            //     this.drawingCtx.strokeStyle = stroke.color;
            //     this.drawingCtx.beginPath();
            //     for (const [x, y] of stroke.stroke) {
            //         this.drawingCtx.lineTo(x, y);
            //     }
            //     this.drawingCtx.stroke();
            //     this.drawingCtx.closePath();
            // }
            console.log(this.srcData.initialized);
            console.log(this.srcData.class);
            console.log(this.srcData.data.length);
            if (!this.srcData.initialized) {
                this.text.textContent = 'bad file format';
                return;
            }
            const data = this.srcData.data;
            if (this.ptr >= data.length) {
                this.ptr = data.length - 1;
            }
            const datai = data[this.ptr];
            this.text.textContent = 'generator class: ' + this.srcData.class + '; ' + 'frame index: ' + datai[0] + '; ' + '[' + this.ptr + '/' + data.length + ']';



            const ious = datai[6];
            const dis = datai[7];
            const sims = datai[8];
            const gtsims = datai[9];
            const gtmasks = datai[10];
            var items2show = [];
            var rowRec = {};
            var colRec = {};
            for (var i = 0; i < datai[2].length; i++) {
                for (var j = 0; j < datai[1].length; j++) {
                    if (gtmasks[i][j]) {
                        const pred = this.predict(this.evalPhase, ious[i][j], dis[i][j], sims[i][j]);
                        if (pred && gtsims[i][j] !== true || !pred && gtsims[i][j] === true) {
                            items2show.push([i, j]);
                            rowRec[i] = true;
                            colRec[j] = true;
                        }
                    }
                }
            }

            var boxL = 60;
            var margin = 30;
            var neededW = 600;
            const smallfont = boxL / 6;
            const normalfont = boxL / 4;

            var neededH = Math.max(Object.keys(rowRec).length * (boxL + margin) + margin * 2, Object.keys(colRec).length * (boxL + margin) + margin * 2);

            this.drawingCanvas.width = neededW;
            this.drawingCanvas.height = neededH;
            this.drawingCtx.fillStyle = 'white';
            this.drawingCtx.fillRect(0, 0, neededW, neededH);


            var rowIdx = 0;
            for (var row in rowRec) {
                rowRec[row] = rowIdx;
                this.drawingCtx.strokeStyle = 'blue';
                this.drawingCtx.font = normalfont.toString() + 'px Arial';
                this.drawingCtx.strokeRect(margin, rowIdx * (boxL + margin) + margin, boxL, boxL);
                this.drawingCtx.strokeText(datai[5][row].toString(), margin + boxL / 7, margin + rowIdx * (boxL + margin) + boxL * 0.8);
                this.drawingCtx.strokeStyle = 'gray';
                this.drawingCtx.font = smallfont.toString() + 'px Arial';
                this.drawingCtx.strokeText('/ ' + datai[3][row].toString(), margin + boxL / 2, margin + rowIdx * (boxL + margin) + boxL * 0.8);
                for (var gt = 0; gt < datai[1].length; gt++) {
                    if (datai[4][gt] >= 0 && datai[4][gt] === datai[5][parseInt(row)]) {
                        break;
                    }
                }
                if (gt >= datai[1].length) {
                    gt = -1;
                }
                this.drawingCtx.strokeText(this.formatinfo(parseInt(row), gt, ious, dis, sims), margin - 5, margin + rowIdx * (boxL + margin) + boxL * 1.2);
                rowIdx += 1;
            }

            var colIdx = 0;
            for (var col in colRec) {
                colRec[col] = colIdx;
                this.drawingCtx.strokeStyle = 'red';
                this.drawingCtx.font = normalfont.toString() + 'px Arial';
                this.drawingCtx.strokeRect(neededW - margin - boxL, colIdx * (boxL + margin) + margin, boxL, boxL);
                const oldWidth = this.drawingCtx.lineWidth;
                this.drawingCtx.strokeText(datai[4][col].toString(), neededW - margin - boxL + boxL / 7, margin + colIdx * (boxL + margin) + boxL * 0.8);
                this.drawingCtx.strokeStyle = 'gray';
                this.drawingCtx.font = smallfont.toString() + 'px Arial';
                this.drawingCtx.strokeText('/ ' + datai[1][col][4].toFixed(2).toString(), neededW - margin - boxL + boxL / 2, margin + colIdx * (boxL + margin) + boxL * 0.8);
                this.drawingCtx.font = smallfont.toString() + 'px Arial';
                for (var gt = 0; gt < datai[2].length; gt++) {
                    if (datai[5][gt] >= 0 && datai[5][gt] === datai[4][parseInt(col)]) {
                        break;
                    }
                }
                if (gt >= datai[2].length) {
                    gt = -1;
                }
                const info = this.formatinfo(gt, parseInt(col), ious, dis, sims);
                this.drawingCtx.strokeText(info, neededW - margin - boxL - info.length * smallfont * 0.17 + 5, margin + colIdx * (boxL + margin) + boxL * 1.2);
                colIdx += 1;
            }

            for (var ii in items2show) {
                var item = items2show[ii];
                var rowIdx = parseInt(rowRec[item[0]]);
                var colIdx = parseInt(colRec[item[1]]);
                this.drawingCtx.strokeStyle = 'green';
                this.drawingCtx.beginPath();
                const lx = margin + boxL + margin;
                const ly = margin + rowIdx * (boxL + margin) + boxL / 2;
                this.drawingCtx.lineTo(lx, ly);
                this.drawingCtx.stroke();
                const rx = neededW - margin - boxL - margin;
                const ry = margin + colIdx * (boxL + margin) + boxL / 2;
                this.drawingCtx.lineTo(rx, ry);
                this.drawingCtx.stroke();
                this.drawingCtx.closePath();
                this.drawingCtx.strokeStyle = 'gray';
                this.drawingCtx.font = smallfont.toString() + 'px Arial';
                const fx = lx + (rx - lx) * 0.1;
                const fy = ly + (ry - ly) * 0.1;
                this.drawingCtx.strokeText(this.formatinfo(item[0], item[1], ious, dis, sims), fx, fy);
            }
        }

        /**
         * @param {Uint8Array | undefined} data 
         * @param {Array<Stroke> | undefined} strokes 
         */
        async reset(data, rawData = true, strokes = []) {
            if (rawData && data) {
                this.srcData = await loadFromData(data);
                this.dataLen = this.srcData.data.length;
                // const img = await loadImageFromData(data);
                // this.initialCanvas.width = this.drawingCanvas.width = img.naturalWidth;
                // this.initialCanvas.height = this.drawingCanvas.height = img.naturalHeight;
                // this.initialCtx.drawImage(img, 0, 0);
                this.ready = true;
            } else {
                this.srcData = data;
                // this.ready = true;
            }

            this.strokes = strokes;
            this._redraw();
        }

        /**
         * @param {Array<Stroke> | undefined} strokes 
         */
        async resetUntitled(strokes = []) {
            // const size = 100;
            // this.initialCanvas.width = this.drawingCanvas.width = size;
            // this.initialCanvas.height = this.drawingCanvas.height = size;

            // this.initialCtx.save();
            // {
            //     this.initialCtx.fillStyle = 'white';
            //     this.initialCtx.fillRect(0, 0, size, size);
            // }
            // this.initialCtx.restore();

            this.srcData = JSON.parse('{"initialized": false}');

            this.ready = true;

            this.strokes = strokes;
            this._redraw();
        }

        /** @return {Promise<Uint8Array>} */
        async getData() {
            // const outCanvas = document.createElement('canvas');
            // outCanvas.width = this.drawingCanvas.width;
            // outCanvas.height = this.drawingCanvas.height;

            // const outCtx = outCanvas.getContext('2d');
            // outCtx.drawImage(this.initialCanvas, 0, 0);
            // outCtx.drawImage(this.drawingCanvas, 0, 0);

            // const blob = await new Promise(resolve => {
            //     outCanvas.toBlob(resolve, 'image/png')
            // });

            return new Uint8Array();
        }
    }

    const editor = new PawDrawEditor(document.querySelector('.drawing-canvas'));

    // Handle messages from the extension
    window.addEventListener('message', async e => {
        const { type, body, requestId } = e.data;
        switch (type) {
            case 'init':
                {
                    editor.setEditable(body.editable);
                    if (body.untitled) {
                        await editor.resetUntitled();
                        return;
                    } else {
                        // Load the initial image into the canvas.
                        const data = new Uint8Array(body.value.data);
                        await editor.reset(data);
                        return;
                    }
                }
            case 'update':
                {
                    const data = body.content ? new Uint8Array(body.content.data) : undefined;
                    const strokes = body.edits.map(edit => new Stroke(edit.color, edit.stroke));
                    await editor.reset(data, true, strokes);
                    return;
                }
            case 'getFileData':
                {
                    // Get the image data for the canvas and post it back to the extension.
                    editor.getData().then(data => {
                        vscode.postMessage({ type: 'response', requestId, body: Array.from(data) });
                    });
                    return;
                }
        }
    });

    // Signal to VS Code that the webview is initialized.
    vscode.postMessage({ type: 'ready' });
}());

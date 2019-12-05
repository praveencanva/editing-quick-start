// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"node_modules/@canva/editing-extensions-api/dist/errors.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @alpha
 */
class UnreachableError {
    constructor(description, message) {
        console.error(`UnreachableError (${description})`, message);
    }
}
exports.UnreachableError = UnreachableError;
/**
 * @alpha
 */
class UnimplementedError extends Error {
}
exports.UnimplementedError = UnimplementedError;

},{}],"node_modules/@canva/editing-extensions-api/dist/event_handler.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @internal
 */
class EventHandler {
    constructor() {
        this.handlers = new Set();
    }
    addEventListener(handler) {
        this.handlers.add(handler);
    }
    removeEventListener(handler) {
        this.handlers.delete(handler);
    }
    emit(...args) {
        return this.handlers.forEach(f => f(...args));
    }
}
exports.EventHandler = EventHandler;

},{}],"node_modules/@canva/editing-extensions-api/dist/mailbox.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @internal
 */
var Envelope;
(function (Envelope) {
    class Minter {
        constructor() {
            this.nextEnvelopeId = 0;
        }
        mint(content, responseToId) {
            return {
                id: this.nextEnvelopeId++,
                content,
                responseToId,
            };
        }
    }
    Envelope.Minter = Minter;
})(Envelope = exports.Envelope || (exports.Envelope = {}));
/**
 * A mailbox for buffering messages. Add messages to the mailbox with
 * `enqueueMessage`, and pull them out of the mailbox with `receiveReply` or
 * `receiveMany`.
 *
 * Messages are kept in the mailbox until it is full, at which
 * point the oldest messages are removed to limit the size. The size of the
 * mailbox can be specified in the constructor.
 * @internal
 */
class Mailbox {
    constructor(opts) {
        this.opts = opts;
        this.handlers = new Set();
        this.messages = [];
    }
    /**
     * Returns a Promise that resolves when the given message type
     * is received. If the message is already in the mailbox, the
     * promise will resolve immediately, otherwise it will continue
     * to listen until a matching message is received.
     */
    receiveReply(envelopeId, timeout) {
        // Scan mailbox for any existing matching messages
        for (const [i, msg] of this.messages.entries()) {
            if (msg.responseToId === envelopeId) {
                // Remove message from mailbox since it's handled
                this.messages.splice(i, 1);
                return Promise.resolve(msg);
            }
        }
        // Wait until matching message is received
        const receivePromise = new Promise(resolve => {
            const handler = (msg) => {
                if (msg.responseToId === envelopeId) {
                    this.handlers.delete(handler);
                    resolve(msg);
                    return true;
                }
                return false;
            };
            this.handlers.add(handler);
        });
        const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(new Error('Mailbox timed out waiting for reply'));
            }, timeout || this.opts.timeout);
        });
        return Promise.race([receivePromise, timeoutPromise]);
    }
    /**
     * Send a message and let any receivers pick it up
     */
    enqueueMessage(msg) {
        // Is there already a handler that matches this message?
        for (const handler of this.handlers.values()) {
            if (handler(msg)) {
                // Handler handled this message
                return;
            }
        }
        // No current handlers, save the message in the mailbox for later
        this.messages.push(msg);
        if (this.messages.length > this.opts.bufferSize) {
            this.messages.shift();
        }
    }
}
exports.Mailbox = Mailbox;

},{}],"node_modules/@canva/editing-extensions-api/dist/iframe_client_comms.js":[function(require,module,exports) {
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const event_handler_1 = require("./event_handler");
const mailbox_1 = require("./mailbox");
/**
 * @internal
 */
class IFrameClientBusComms {
    constructor(port) {
        this.port = port;
        this.envelopeMinter = new mailbox_1.Envelope.Minter();
        this.mailbox = new mailbox_1.Mailbox({
            bufferSize: IFrameClientBusComms.MAILBOX_BUFFER_SIZE,
            timeout: IFrameClientBusComms.MESSAGING_TIMEOUT,
        });
        this.messageHandler = new event_handler_1.EventHandler();
        this.onPortMessage = (event) => {
            // console.log('[Client] Receiving event =', event);
            const message = event.data;
            if (message.responseToId != null) {
                this.mailbox.enqueueMessage(message);
            }
            this.messageHandler.emit(event);
        };
        this.port.onmessage = this.onPortMessage;
    }
    onMessage(handler) {
        this.messageHandler.addEventListener((event) => __awaiter(this, void 0, void 0, function* () {
            const message = event.data;
            if (message.responseToId == null) {
                const response = yield handler(message.content);
                if (response) {
                    this.respondTo(response, message.id);
                }
            }
        }));
    }
    castMessage(msg) {
        this.port.postMessage(this.envelopeMinter.mint(msg));
    }
    sendMessage(msg, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            const envelope = this.envelopeMinter.mint(msg);
            // console.log('[Client] Sending Envelope =', envelope);
            this.port.postMessage(envelope);
            const response = yield this.mailbox.receiveReply(envelope.id, timeout);
            return response.content;
        });
    }
    respondTo(message, responseToId) {
        this.port.postMessage(this.envelopeMinter.mint(message, responseToId));
    }
}
exports.IFrameClientBusComms = IFrameClientBusComms;
IFrameClientBusComms.MAILBOX_BUFFER_SIZE = 5;
IFrameClientBusComms.MESSAGING_TIMEOUT = 5000;

},{"./event_handler":"node_modules/@canva/editing-extensions-api/dist/event_handler.js","./mailbox":"node_modules/@canva/editing-extensions-api/dist/mailbox.js"}],"node_modules/@canva/editing-extensions-api/dist/canva_api_client.js":[function(require,module,exports) {
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_1 = require("./errors");
const iframe_client_comms_1 = require("./iframe_client_comms");
/**
 * API client provided to devs for use in their app iframes
 * Reduces boilerplate when interacting with host iFrame
 */
class CanvaApiClient {
    constructor(comms) {
        this.comms = comms;
        this.remoteProcessCounter = 0;
        this.onReceiveMessage = (message) => __awaiter(this, void 0, void 0, function* () {
            // if the app has called exit() then don't send it any messages, but we can respond
            // to a save request in case messages got out of order over the wire
            if (this.exitingWithImage) {
                if (message.topic === "save_request" /* SAVE_REQUEST */) {
                    return Promise.resolve({
                        topic: "save_response" /* SAVE_RESPONSE */,
                        image: this.exitingWithImage,
                    });
                }
                return;
            }
            switch (message.topic) {
                case "controls_event" /* CONTROLS_EVENT */:
                    return this.handleControlsEvent(message);
                case "image_update" /* IMAGE_UPDATE */:
                    return this.handleImageUpdate(message);
                case "viewport_resize" /* VIEWPORT_RESIZE */:
                    return this.handleViewportResize(message);
                case "save_request" /* SAVE_REQUEST */:
                    return this.handleSaveRequest();
                case "init_request" /* INIT_REQUEST */:
                    return this.handleInitRequest(message);
                case "remote_process_started" /* REMOTE_PROCESS_STARTED */:
                case "remote_process_progress" /* REMOTE_PROCESS_PROGRESS */:
                case "remote_process_complete" /* REMOTE_PROCESS_COMPLETE */:
                    // console.log(`[Client] receieved ${message.topic}`);
                    if (this.remoteProcessStateMachine &&
                        message.processId === this.remoteProcessCounter) {
                        return this.remoteProcessStateMachine.receive(message);
                    }
                    else {
                        throw new Error(`Unsolicited ${message.topic} message received processId: ${message.processId}`);
                    }
                    break;
                case "presets_request" /* PRESETS_REQUEST */:
                    return this.handlePresetsRequest(message);
                case "preset_selected" /* PRESET_SELECTED */:
                    return this.handlePresetSelected(message);
                default:
                    throw new errors_1.UnreachableError('Unknown message type', message);
            }
        });
        this.comms = comms;
        this.comms.onMessage(this.onReceiveMessage);
    }
    static initialize(handler) {
        return __awaiter(this, void 0, void 0, function* () {
            const messageChannel = new MessageChannel();
            const comms = new iframe_client_comms_1.IFrameClientBusComms(messageChannel.port1);
            const api = new CanvaApiClient(comms);
            yield handler(api);
            this.sendWakeUp(messageChannel.port2);
            return;
        });
    }
    /**
     * @internal
     */
    static sendWakeUp(port) {
        // console.log('[Client] Sending WAKE_UP event');
        window.parent.postMessage({
            topic: "wake_up" /* WAKE_UP */,
        }, '*', [port]);
    }
    /**
     * This function registers a callback that initializes an app.
     * @param handler Function that initializes an app. Both synchronous and asynchronous functions are supported.
     * @alpha
     */
    onReady(handler) {
        // console.log('setting onReady handler');
        this.readyHandler = handler;
    }
    /**
     * @alpha
     */
    onControlsEvent(handler) {
        // console.log('setting onControlsEvent handler');
        this.controlsEventHandler = handler;
    }
    /**
     * @alpha
     */
    onPresetsRequest(handler) {
        this.presetsRequestHandler = handler;
    }
    /**
     * @alpha
     */
    onPresetSelected(handler) {
        this.presetSelectedHandler = handler;
    }
    /**
     * @alpha
     */
    onSaveRequest(handler) {
        this.saveRequestHandler = handler;
    }
    /**
     * @alpha
     */
    onImageUpdate(handler) {
        if (this.imageUpdateHandler) {
            throw new Error('ImageUpdateHandler event handler has already been defined');
        }
        this.imageUpdateHandler = handler;
    }
    /**
     * @alpha
     */
    onViewportResize(handler) {
        if (this.viewportResizeHandler) {
            throw new Error('ViewportResize event handler has already been defined');
        }
        this.viewportResizeHandler = handler;
    }
    handleInitRequest(message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // console.log('[Client] Received INIT_REQUEST');
                if (this.readyHandler) {
                    const { topic } = message, options = __rest(message, ["topic"]);
                    yield this.readyHandler(options);
                }
                // console.log('[Client] Sending INIT_RESPONSE');
                return {
                    topic: "init_response" /* INIT_RESPONSE */,
                };
            }
            catch (e) {
                // TODO Report the error
                console.error('[Client] Cannot run the extension:', e.message);
                console.error(e);
                // console.log('[Client] Sending INIT_RESPONSE (error = true)');
                return {
                    topic: "init_response" /* INIT_RESPONSE */,
                    error: true,
                };
            }
        });
    }
    overrideThumbnail(thumbnailId, thumbnail) {
        this.comms.castMessage({
            topic: "thumbnail_override" /* THUMBNAIL_OVERRIDE */,
            thumbnailId,
            thumbnail,
        });
    }
    updateControlPanel(controls, overlay) {
        this.comms.castMessage({
            topic: "controls_render" /* CONTROLS_RENDER */,
            controls,
            overlay,
        });
    }
    handleControlsEvent(message) {
        if (this.controlsEventHandler) {
            this.controlsEventHandler(message.message);
        }
    }
    handleImageUpdate(message) {
        const { image } = message;
        if (this.imageUpdateHandler) {
            this.imageUpdateHandler(image);
        }
    }
    handleViewportResize(message) {
        const { size, commit } = message;
        if (this.viewportResizeHandler) {
            this.viewportResizeHandler(size, commit);
        }
    }
    handleSaveRequest() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.saveRequestHandler) {
                throw new Error('Received save request, but no handler configured.');
            }
            const image = yield this.saveRequestHandler();
            return {
                topic: "save_response" /* SAVE_RESPONSE */,
                image,
            };
        });
    }
    handlePresetsRequest(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.presetsRequestHandler) {
                throw new Error('Received presets request, but no handler configured.');
            }
            const presets = yield this.presetsRequestHandler({
                minDimensions: message.minDimensions,
                image: message.image,
            });
            return {
                topic: "presets_response" /* PRESETS_RESPONSE */,
                presets,
            };
        });
    }
    handlePresetSelected(message) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.presetSelectedHandler) {
                return;
            }
            this.presetSelectedHandler({ presetId: message.presetId });
        });
    }
    /**
     * @internal Remote processes aren't yet supported by third-party apps
     */
    remoteProcess(input, progressHandler, idHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const onStart = (started) => idHandler && idHandler(started.inputImageId);
                const onProgress = (progress) => progressHandler &&
                    progressHandler(progress.label, progress.done, progress.total);
                const onComplete = (complete) => complete.result ? resolve(complete.result) : reject(complete.error);
                this.remoteProcessStateMachine = new RemoteProcessStateMachine(onStart, onProgress, onComplete);
                // console.log('[Client] sending START_REMOTE_PROCESS');
                this.comms.castMessage({
                    topic: "start_remote_process" /* START_REMOTE_PROCESS */,
                    processId: ++this.remoteProcessCounter,
                    input,
                });
            });
        });
    }
    /**
     * @alpha
     */
    exit(image) {
        this.exitingWithImage = image;
        this.comms.castMessage({
            topic: "exit" /* EXIT */,
            image,
        });
    }
}
exports.CanvaApiClient = CanvaApiClient;
class RemoteProcessStateMachine {
    constructor(onStart, onProgress, onComplete) {
        this.onStart = onStart;
        this.onProgress = onProgress;
        this.onComplete = onComplete;
        this.state = 'READY';
        this.startedMessage = undefined;
        this.progressMessages = [];
        this.completeMessage = undefined;
    }
    receive(message) {
        switch (message.topic) {
            case "remote_process_started" /* REMOTE_PROCESS_STARTED */:
                if (this.startedMessage) {
                    throw new Error(`Receieved too many ${message.topic} messages`);
                }
                this.startedMessage = message;
                break;
            case "remote_process_progress" /* REMOTE_PROCESS_PROGRESS */:
                this.progressMessages.push(message);
                break;
            case "remote_process_complete" /* REMOTE_PROCESS_COMPLETE */:
                if (this.completeMessage) {
                    throw new Error(`Receieved too many ${message.topic} messages`);
                }
                this.completeMessage = message;
                break;
            default:
                throw new errors_1.UnreachableError('Unknown message type', message);
        }
        this.handleMessages();
    }
    handleMessages() {
        switch (this.state) {
            case 'READY':
                if (this.startedMessage) {
                    this.onStart(this.startedMessage);
                    this.state = 'STARTED';
                    this.handleMessages();
                }
                break;
            case 'STARTED':
                if (this.progressMessages.length > 0) {
                    this.onProgress(this.progressMessages[0]);
                    this.progressMessages.shift();
                    this.handleMessages();
                }
                else if (this.completeMessage) {
                    this.onComplete(this.completeMessage);
                    this.state = 'DONE';
                }
                break;
            case 'DONE':
                // do nothing
                break;
            default:
                throw new errors_1.UnreachableError('Unknown state', this.state);
        }
    }
}

},{"./errors":"node_modules/@canva/editing-extensions-api/dist/errors.js","./iframe_client_comms":"node_modules/@canva/editing-extensions-api/dist/iframe_client_comms.js"}],"node_modules/@canva/editing-extensions-api/dist/canva_image.js":[function(require,module,exports) {
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// Edge doesn't support `toBlob`. Implementation below based on
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#Polyfill
const canvasToBlob = (canvas, type, quality) => __awaiter(void 0, void 0, void 0, function* () {
    // use native canvas.toBlob, if available
    if (typeof canvas.toBlob === 'function') {
        const blob = yield new Promise((resolve, reject) => {
            try {
                canvas.toBlob(b => (b instanceof Blob ? resolve(b) : reject(b)), type, quality);
            }
            catch (e) {
                reject(e);
            }
        });
        return blob;
    }
    // roll this manually with a dataURL
    const dataUrl = canvas.toDataURL(type, quality).split(',')[1];
    const binStr = atob(dataUrl);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type: type || 'image/png' });
});
// From: https://stackoverflow.com/questions/12168909/blob-from-dataurl
// TODO(Jordan): Handle cases were URI is malformed
function dataURItoBlob(dataURI) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(dataURI.split(',')[1]);
    // separate out the mime component
    const mimeString = dataURI
        .split(',')[0]
        .split(':')[1]
        .split(';')[0];
    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);
    // create a view into the buffer
    const ia = new Uint8Array(ab);
    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    // write the ArrayBuffer to a blob, and you're done
    return new Blob([ab], { type: mimeString });
}
const isSafari = navigator &&
    navigator.userAgent.match(/chrome/i) &&
    navigator.userAgent.match(/safari/i);
const blobToImage = (blob) => {
    return isSafari ? blobToImageViaReader(blob) : blobToImageViaObjectUrl(blob);
};
// slow path for Safari - it seems to have troubles with `createObjectURL` and race conditions
// `WebKitBlobResource error 1`
const blobToImageViaReader = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function () {
            if (reader && reader.result instanceof ArrayBuffer) {
                const arrayBuffToImage = blobToImageViaObjectUrl(new Blob([new Uint8Array(reader.result)], { type: blob.type }));
                resolve(arrayBuffToImage);
            }
            else {
                reject('unknown error');
            }
        };
        reader.onerror = e => reject(e);
        reader.readAsArrayBuffer(blob);
    });
};
const blobToImageViaObjectUrl = (blob) => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        const url = URL.createObjectURL(blob);
        image.onload = () => {
            resolve(image);
            URL.revokeObjectURL(url);
        };
        image.onerror = () => {
            console.error('blobToImage', 'failed');
            reject('Could not load image');
        };
        image.src = url;
    });
};
/**
 * @alpha
 */
var CanvaImage;
(function (CanvaImage) {
    CanvaImage.fromCanvas = (imageType, canvas, quality) => __awaiter(this, void 0, void 0, function* () {
        const blob = yield canvasToBlob(canvas, imageType, quality);
        if (blob instanceof Blob) {
            // console.log('blob resolve');
            const { width, height } = canvas;
            return { blob, imageType, width, height };
        }
        throw new Error('Could not create Blob from Canvas');
    });
    CanvaImage.fromDataUrl = (imageType, dataUrl) => __awaiter(this, void 0, void 0, function* () {
        const blob = dataURItoBlob(dataUrl);
        const { width, height } = yield blobToImage(blob);
        return {
            blob,
            imageType,
            width,
            height,
        };
    });
    CanvaImage.fromUrl = (url) => __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch(url);
        const blob = yield response.blob();
        const imageType = blob.type;
        const { width, height } = yield blobToImage(blob);
        return {
            blob,
            imageType,
            width,
            height,
        };
    });
    CanvaImage.toImageElement = (t) => blobToImage(t.blob);
    CanvaImage.toDataUrl = (t) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                if (reader.result && typeof reader.result === 'string') {
                    resolve(reader.result);
                }
                else {
                    reject('Unexpected FileReader result');
                }
            };
            reader.onerror = () => {
                reject('Error loading blob');
            };
            reader.readAsDataURL(t.blob);
        });
    };
    CanvaImage.getSize = (t) => ({
        width: t.width,
        height: t.height,
    });
})(CanvaImage = exports.CanvaImage || (exports.CanvaImage = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/base.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ControlName;
(function (ControlName) {
    ControlName["BUTTON"] = "button";
    ControlName["COLOR_PICKER"] = "color_picker";
    ControlName["PAGE"] = "control_panel";
    ControlName["GROUP"] = "group";
    ControlName["SELECT"] = "select";
    ControlName["SLIDER"] = "slider";
    ControlName["THUMBNAIL_LIST"] = "thumbnail_list";
    ControlName["TEXT_INPUT"] = "text_input";
    ControlName["CHECKBOX"] = "checkbox";
    ControlName["PARAGRAPH"] = "paragraph";
    ControlName["RADIO_GROUP"] = "radio_group";
})(ControlName = exports.ControlName || (exports.ControlName = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/slider.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Slider;
(function (Slider) {
    Slider.create = (props) => (Object.assign({ type: "slider" /* SLIDER */ }, props));
})(Slider = exports.Slider || (exports.Slider = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/button.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Button;
(function (Button) {
    Button.create = (props) => (Object.assign({ type: "button" /* BUTTON */ }, props));
})(Button = exports.Button || (exports.Button = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/group.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Group;
(function (Group) {
    Group.create = (props) => (Object.assign({ type: "group" /* GROUP */ }, props));
})(Group = exports.Group || (exports.Group = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/select.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Select;
(function (Select) {
    Select.create = (props) => (Object.assign({ type: "select" /* SELECT */ }, props));
})(Select = exports.Select || (exports.Select = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/radio-group.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var RadioGroup;
(function (RadioGroup) {
    RadioGroup.create = (props) => (Object.assign({ type: "radio_group" /* RADIO_GROUP */ }, props));
})(RadioGroup = exports.RadioGroup || (exports.RadioGroup = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/text_input.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TextInput;
(function (TextInput) {
    TextInput.create = (props) => {
        return Object.assign({ type: "text_input" /* TEXT_INPUT */ }, props);
    };
})(TextInput = exports.TextInput || (exports.TextInput = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/checkbox.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Checkbox;
(function (Checkbox) {
    Checkbox.create = (props) => (Object.assign({ type: "checkbox" /* CHECKBOX */ }, props));
})(Checkbox = exports.Checkbox || (exports.Checkbox = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/paragraph.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Paragraph;
(function (Paragraph) {
    Paragraph.create = (props) => (Object.assign({ type: "paragraph" /* PARAGRAPH */ }, props));
})(Paragraph = exports.Paragraph || (exports.Paragraph = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/control_kit.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = require("./base");
exports.ControlName = base_1.ControlName;
var slider_1 = require("./slider");
exports.Slider = slider_1.Slider;
var button_1 = require("./button");
exports.Button = button_1.Button;
var group_1 = require("./group");
exports.Group = group_1.Group;
var select_1 = require("./select");
exports.Select = select_1.Select;
var radio_group_1 = require("./radio-group");
exports.RadioGroup = radio_group_1.RadioGroup;
var text_input_1 = require("./text_input");
exports.TextInput = text_input_1.TextInput;
var checkbox_1 = require("./checkbox");
exports.Checkbox = checkbox_1.Checkbox;
var paragraph_1 = require("./paragraph");
exports.Paragraph = paragraph_1.Paragraph;
// TODO move these to their own .ts file
var ColorPicker;
(function (ColorPicker) {
    ColorPicker.create = (props) => (Object.assign({ type: "color_picker" /* COLOR_PICKER */ }, props));
})(ColorPicker = exports.ColorPicker || (exports.ColorPicker = {}));
var Page;
(function (Page) {
    /**
     * @param controls List of controls to show in the page
     * @param subpage (Optional) Whether the app receives the back button event
     * @param title (Optional) i18n'd title shown in subpage header
     * @param action (Optional) i18n'd action shown in subpage header
     */
    Page.create = ({ subpage, title, actionLabel, controls, }) => {
        return subpage
            ? {
                type: "control_panel" /* PAGE */,
                id: 'control_panel',
                subpage: true,
                title,
                actionLabel,
                controls,
            }
            : {
                type: "control_panel" /* PAGE */,
                id: 'control_panel',
                subpage: false,
                controls,
            };
    };
})(Page = exports.Page || (exports.Page = {}));

},{"./base":"node_modules/@canva/editing-extensions-api/dist/control_kit/base.js","./slider":"node_modules/@canva/editing-extensions-api/dist/control_kit/slider.js","./button":"node_modules/@canva/editing-extensions-api/dist/control_kit/button.js","./group":"node_modules/@canva/editing-extensions-api/dist/control_kit/group.js","./select":"node_modules/@canva/editing-extensions-api/dist/control_kit/select.js","./radio-group":"node_modules/@canva/editing-extensions-api/dist/control_kit/radio-group.js","./text_input":"node_modules/@canva/editing-extensions-api/dist/control_kit/text_input.js","./checkbox":"node_modules/@canva/editing-extensions-api/dist/control_kit/checkbox.js","./paragraph":"node_modules/@canva/editing-extensions-api/dist/control_kit/paragraph.js"}],"node_modules/@canva/editing-extensions-api/dist/control_kit/preview_overlay.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PreviewOverlay;
(function (PreviewOverlay) {
    PreviewOverlay.type = 'PREVIEW_OVERLAY';
    let NotificationType;
    (function (NotificationType) {
        NotificationType["SUCCESS"] = "success";
        NotificationType["ERROR"] = "error";
        NotificationType["INFO"] = "info";
    })(NotificationType = PreviewOverlay.NotificationType || (PreviewOverlay.NotificationType = {}));
    PreviewOverlay.create = (props) => (Object.assign({ type: PreviewOverlay.type }, props));
})(PreviewOverlay = exports.PreviewOverlay || (exports.PreviewOverlay = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/control_kit/thumbnail_list.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ThumbnailId;
(function (ThumbnailId) {
    ThumbnailId.create = (id) => id;
})(ThumbnailId = exports.ThumbnailId || (exports.ThumbnailId = {}));
var ThumbnailList;
(function (ThumbnailList) {
    ThumbnailList.create = (props) => (Object.assign({ type: "thumbnail_list" /* THUMBNAIL_LIST */ }, props));
})(ThumbnailList = exports.ThumbnailList || (exports.ThumbnailList = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/canva_api.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Message;
(function (Message) {
    let Topic;
    (function (Topic) {
        Topic["WAKE_UP"] = "wake_up";
        // Initial setup
        Topic["INIT_REQUEST"] = "init_request";
        Topic["INIT_RESPONSE"] = "init_response";
        // Canva requests presets
        Topic["PRESETS_REQUEST"] = "presets_request";
        Topic["PRESETS_RESPONSE"] = "presets_response";
        // A preset was selected by the user; let the app know
        Topic["PRESET_SELECTED"] = "preset_selected";
        // Sending the controls and managing their state
        Topic["CONTROLS_RENDER"] = "controls_render";
        Topic["CONTROLS_EVENT"] = "controls_event";
        Topic["THUMBNAIL_OVERRIDE"] = "thumbnail_override";
        // Sending a new image for the app to use
        Topic["IMAGE_UPDATE"] = "image_update";
        // Resizing the viewport
        Topic["VIEWPORT_RESIZE"] = "viewport_resize";
        // Sending a rendered image from the app
        Topic["SAVE_REQUEST"] = "save_request";
        Topic["SAVE_RESPONSE"] = "save_response";
        // Process an image using the server
        Topic["START_REMOTE_PROCESS"] = "start_remote_process";
        Topic["REMOTE_PROCESS_STARTED"] = "remote_process_started";
        Topic["REMOTE_PROCESS_PROGRESS"] = "remote_process_progress";
        Topic["REMOTE_PROCESS_COMPLETE"] = "remote_process_complete";
        // The app is done and wants to exit
        Topic["EXIT"] = "exit";
    })(Topic = Message.Topic || (Message.Topic = {}));
})(Message = exports.Message || (exports.Message = {}));

},{}],"node_modules/@canva/editing-extensions-api/dist/host/host_bus.js":[function(require,module,exports) {
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../");
class HostBus {
    constructor({ comms }) {
        // Amount of time an app is given to respond with an image
        this.SAVE_TIMEOUT = 20000;
        this.seq = 0;
        this.thumbnailOverrideHandler = new __1.EventHandler();
        this.controlsRenderHandler = new __1.EventHandler();
        this.saveRequested = false;
        /**
         * Handle incoming messages from iframes belonging to the dev.
         */
        this.onReceiveMessage = (message) => __awaiter(this, void 0, void 0, function* () {
            switch (message.topic) {
                case "controls_render" /* CONTROLS_RENDER */:
                    // console.log('[Host] Received CONTROLS_RENDER');
                    this.controlsRenderHandler.emit(this.seq++, message.controls, message.overlay);
                    break;
                case "thumbnail_override" /* THUMBNAIL_OVERRIDE */:
                    // console.log('[Host] Received THUMBNAIL_OVERRIDE');
                    this.thumbnailOverrideHandler.emit(message.thumbnailId, message.thumbnail);
                    break;
                case "start_remote_process" /* START_REMOTE_PROCESS */:
                    // console.log('[Host] Received START_REMOTE_PROCESS');
                    this.handleStartRemoteProcess(message);
                    break;
                case "exit" /* EXIT */:
                    // console.log('[Host] Received EXIT');
                    this.handleExit(message);
                    break;
                case "init_response" /* INIT_RESPONSE */:
                case "save_response" /* SAVE_RESPONSE */:
                case "presets_response" /* PRESETS_RESPONSE */:
                    throw new Error(`Unsolicited ${message.topic} response received`);
                default:
                    throw new __1.UnreachableError('Unknown message type', message);
            }
        });
        this.comms = comms;
        comms.onMessage(this.onReceiveMessage);
    }
    sendInitMessage(options) {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log('[Host] Sending INIT_REQUEST');
            const response = yield this.comms.sendMessage(Object.assign({ topic: "init_request" /* INIT_REQUEST */ }, options));
            if (response.error) {
                throw new Error('Could not initialize the app');
            }
        });
    }
    sendControlsEvent(msg) {
        // console.log('[Host] Sending CONTROLS_EVENT');
        this.comms.castMessage({
            topic: "controls_event" /* CONTROLS_EVENT */,
            message: msg,
        });
    }
    sendViewportResize(size, commit) {
        // console.log('[Host] Sending VIEWPORT_RESIZE');
        this.comms.castMessage({
            topic: "viewport_resize" /* VIEWPORT_RESIZE */,
            commit,
            size,
        });
    }
    sendImageUpdate(image) {
        // console.log('[Host] Sending IMAGE_UPDATE');
        this.comms.castMessage({
            topic: "image_update" /* IMAGE_UPDATE */,
            image,
        });
    }
    // TODO: Add deserialize for type safety
    sendSaveRequest() {
        return __awaiter(this, void 0, void 0, function* () {
            // console.log('[Host] Sending SAVE_REQUEST');
            this.saveRequested = true;
            const response = yield this.comms.sendMessage({
                topic: "save_request" /* SAVE_REQUEST */,
            }, this.SAVE_TIMEOUT);
            return response.image;
        });
    }
    onOverrideThumbnail(handler) {
        this.thumbnailOverrideHandler.addEventListener(handler);
    }
    onUpdateControlPanel(handler) {
        this.controlsRenderHandler.addEventListener(handler);
    }
    onRemoteProcess(handler) {
        this.remoteProcessHandler = handler;
    }
    onExit(handler) {
        this.exitHandler = handler;
    }
    sendPresetsRequest(image, minDimensions) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.comms.sendMessage({
                topic: "presets_request" /* PRESETS_REQUEST */,
                minDimensions,
                image,
            });
            return response.presets;
        });
    }
    sendPresetSelected(presetId) {
        this.comms.castMessage({
            topic: "preset_selected" /* PRESET_SELECTED */,
            presetId,
        });
    }
    handleStartRemoteProcess(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const { processId, input } = message;
            if (!this.remoteProcessHandler) {
                throw new Error('Received remote process request with no handler registered');
            }
            // console.log(`[Host] Received START_REMOTE_PROCESS processId: ${processId}`);
            // receive progress from the remoteProcessHandler and cast it to the comms
            const progressHandler = (label, done, total) => {
                // console.log(`[Host] Received REMOTE_PROCESS_PROGRESS processId: ${processId}`);
                this.comms.castMessage({
                    topic: "remote_process_progress" /* REMOTE_PROCESS_PROGRESS */,
                    processId,
                    label,
                    done,
                    total,
                });
            };
            const { inputImageId: inputImageIdPromise, result: resultPromise, } = this.remoteProcessHandler(input, progressHandler);
            // console.log(`[Host] Sending REMOTE_PROCESS_STARTED processId: ${processId}`);
            const inputImageId = yield inputImageIdPromise;
            this.comms.castMessage({
                topic: "remote_process_started" /* REMOTE_PROCESS_STARTED */,
                processId,
                inputImageId,
            });
            try {
                // console.log(`[Host] Sending REMOTE_PROCESS_COMPLETE (success) processId: ${processId}`);
                const result = yield resultPromise;
                this.comms.castMessage({
                    topic: "remote_process_complete" /* REMOTE_PROCESS_COMPLETE */,
                    processId,
                    result,
                });
            }
            catch (error) {
                // console.log(`[Host] Sending REMOTE_PROCESS_COMPLETE (error) processId: ${processId}`);
                this.comms.castMessage({
                    topic: "remote_process_complete" /* REMOTE_PROCESS_COMPLETE */,
                    processId,
                    error,
                });
            }
        });
    }
    handleExit(message) {
        if (!this.exitHandler) {
            throw new Error('EXIT called, but no handler registered');
        }
        // if the host has requested a save, then don't call the exitHandler
        if (this.saveRequested) {
            return;
        }
        this.exitHandler(message.image);
    }
}
exports.HostBus = HostBus;

},{"../":"node_modules/@canva/editing-extensions-api/dist/index.js"}],"node_modules/@canva/editing-extensions-api/dist/host/iframe_host_comms.js":[function(require,module,exports) {
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../");
class IFrameHostBusComms {
    constructor(port) {
        this.port = port;
        this.mailbox = new __1.Mailbox({
            bufferSize: IFrameHostBusComms.MAILBOX_BUFFER_SIZE,
            timeout: IFrameHostBusComms.MESSAGING_TIMEOUT,
        });
        this.envelopeMinter = new __1.Envelope.Minter();
        this.messageHandler = new __1.EventHandler();
        this.onPortMessage = (event) => {
            // console.log('[Host] Receiving event =', event);
            const message = event.data;
            if (message.responseToId != null) {
                this.mailbox.enqueueMessage(message);
            }
            this.messageHandler.emit(event);
        };
        this.port.onmessage = this.onPortMessage;
    }
    onMessage(handler) {
        this.messageHandler.addEventListener((event) => __awaiter(this, void 0, void 0, function* () {
            const message = event.data;
            if (message.responseToId == null) {
                const response = yield handler(message.content);
                if (response) {
                    this.respondTo(response, message.id);
                }
            }
        }));
    }
    castMessage(msg) {
        this.port.postMessage(this.envelopeMinter.mint(msg));
    }
    sendMessage(msg, timeout) {
        return __awaiter(this, void 0, void 0, function* () {
            const envelope = this.envelopeMinter.mint(msg);
            // console.log('[Host] Sending Envelope =', envelope);
            this.port.postMessage(envelope);
            const response = yield this.mailbox.receiveReply(envelope.id, timeout);
            return response.content;
        });
    }
    respondTo(message, responseToId) {
        this.port.postMessage(this.envelopeMinter.mint(message, responseToId));
    }
}
exports.IFrameHostBusComms = IFrameHostBusComms;
IFrameHostBusComms.MAILBOX_BUFFER_SIZE = 5;
IFrameHostBusComms.MESSAGING_TIMEOUT = 5000;

},{"../":"node_modules/@canva/editing-extensions-api/dist/index.js"}],"node_modules/@canva/editing-extensions-api/dist/host/iframe_connection.js":[function(require,module,exports) {
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const iframe_host_comms_1 = require("./iframe_host_comms");
function connect(iframe) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            try {
                const listener = (event) => {
                    const message = event.data;
                    if (event.source !== iframe.contentWindow ||
                        message.topic !== "wake_up" /* WAKE_UP */) {
                        return;
                    }
                    // console.log('[Host] Received WAKE_UP');
                    const [port] = event.ports;
                    window.removeEventListener('message', listener);
                    resolve(new iframe_host_comms_1.IFrameHostBusComms(port));
                };
                window.addEventListener('message', listener);
            }
            catch (e) {
                reject(e);
            }
        });
    });
}
exports.connect = connect;

},{"./iframe_host_comms":"node_modules/@canva/editing-extensions-api/dist/host/iframe_host_comms.js"}],"node_modules/@canva/editing-extensions-api/dist/index.js":[function(require,module,exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const canva_api_client_1 = require("./canva_api_client");
exports.CanvaApiClient = canva_api_client_1.CanvaApiClient;
// canva image
var canva_image_1 = require("./canva_image");
exports.CanvaImage = canva_image_1.CanvaImage;
// control kit types
var control_kit_1 = require("./control_kit/control_kit");
exports.ControlName = control_kit_1.ControlName;
// control kit components
var control_kit_2 = require("./control_kit/control_kit");
exports.ColorPicker = control_kit_2.ColorPicker;
exports.Page = control_kit_2.Page;
exports.Select = control_kit_2.Select;
var group_1 = require("./control_kit/group");
exports.Group = group_1.Group;
var slider_1 = require("./control_kit/slider");
exports.Slider = slider_1.Slider;
var button_1 = require("./control_kit/button");
exports.Button = button_1.Button;
var checkbox_1 = require("./control_kit/checkbox");
exports.Checkbox = checkbox_1.Checkbox;
var paragraph_1 = require("./control_kit/paragraph");
exports.Paragraph = paragraph_1.Paragraph;
var text_input_1 = require("./control_kit/text_input");
exports.TextInput = text_input_1.TextInput;
var radio_group_1 = require("./control_kit/radio-group");
exports.RadioGroup = radio_group_1.RadioGroup;
var preview_overlay_1 = require("./control_kit/preview_overlay");
exports.PreviewOverlay = preview_overlay_1.PreviewOverlay;
var thumbnail_list_1 = require("./control_kit/thumbnail_list");
exports.ThumbnailId = thumbnail_list_1.ThumbnailId;
exports.ThumbnailList = thumbnail_list_1.ThumbnailList;
// errors
var errors_1 = require("./errors");
exports.UnreachableError = errors_1.UnreachableError;
exports.UnimplementedError = errors_1.UnimplementedError;
var canva_api_1 = require("./canva_api");
exports.Message = canva_api_1.Message;
var mailbox_1 = require("./mailbox");
exports.Envelope = mailbox_1.Envelope;
exports.Mailbox = mailbox_1.Mailbox;
var event_handler_1 = require("./event_handler");
exports.EventHandler = event_handler_1.EventHandler;
// TODO split out into `@canva/editing-extensions-host`
var host_bus_1 = require("./host/host_bus");
exports.HostBus = host_bus_1.HostBus;
var iframe_connection_1 = require("./host/iframe_connection");
exports.connect = iframe_connection_1.connect;
const canva_image_2 = require("./canva_image");
const preview_overlay_2 = require("./control_kit/preview_overlay");
const thumbnail_list_2 = require("./control_kit/thumbnail_list");
const control_kit_3 = require("./control_kit/control_kit");
if (window.__exposeCanvaOnWindow) {
    window.canva = {
        CanvaApiClient: canva_api_client_1.CanvaApiClient,
        CanvaImage: canva_image_2.CanvaImage,
        Button: control_kit_3.Button,
        Checkbox: control_kit_3.Checkbox,
        ColorPicker: control_kit_3.ColorPicker,
        Group: control_kit_3.Group,
        Page: control_kit_3.Page,
        Paragraph: control_kit_3.Paragraph,
        PreviewOverlay: preview_overlay_2.PreviewOverlay,
        Select: control_kit_3.Select,
        Slider: control_kit_3.Slider,
        TextInput: control_kit_3.TextInput,
        ThumbnailList: thumbnail_list_2.ThumbnailList,
    };
}

},{"./canva_api_client":"node_modules/@canva/editing-extensions-api/dist/canva_api_client.js","./canva_image":"node_modules/@canva/editing-extensions-api/dist/canva_image.js","./control_kit/control_kit":"node_modules/@canva/editing-extensions-api/dist/control_kit/control_kit.js","./control_kit/group":"node_modules/@canva/editing-extensions-api/dist/control_kit/group.js","./control_kit/slider":"node_modules/@canva/editing-extensions-api/dist/control_kit/slider.js","./control_kit/button":"node_modules/@canva/editing-extensions-api/dist/control_kit/button.js","./control_kit/checkbox":"node_modules/@canva/editing-extensions-api/dist/control_kit/checkbox.js","./control_kit/paragraph":"node_modules/@canva/editing-extensions-api/dist/control_kit/paragraph.js","./control_kit/text_input":"node_modules/@canva/editing-extensions-api/dist/control_kit/text_input.js","./control_kit/radio-group":"node_modules/@canva/editing-extensions-api/dist/control_kit/radio-group.js","./control_kit/preview_overlay":"node_modules/@canva/editing-extensions-api/dist/control_kit/preview_overlay.js","./control_kit/thumbnail_list":"node_modules/@canva/editing-extensions-api/dist/control_kit/thumbnail_list.js","./errors":"node_modules/@canva/editing-extensions-api/dist/errors.js","./canva_api":"node_modules/@canva/editing-extensions-api/dist/canva_api.js","./mailbox":"node_modules/@canva/editing-extensions-api/dist/mailbox.js","./event_handler":"node_modules/@canva/editing-extensions-api/dist/event_handler.js","./host/host_bus":"node_modules/@canva/editing-extensions-api/dist/host/host_bus.js","./host/iframe_connection":"node_modules/@canva/editing-extensions-api/dist/host/iframe_connection.js"}],"controls.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.renderSettings = void 0;

var _editingExtensionsApi = require("@canva/editing-extensions-api");

const renderSettings = state => {
  const {
    text,
    watermarkPostion,
    size,
    color,
    opacity
  } = state;
  return [_editingExtensionsApi.Paragraph.create({
    id: 'paragraph',
    text: 'Provide copyright watermark on your protected images.'
  }), _editingExtensionsApi.Group.create({
    id: 'settingsGroup',
    label: 'Settings',
    children: [_editingExtensionsApi.Group.create({
      id: 'postionRadioGroup',
      label: 'Postion',
      children: [_editingExtensionsApi.RadioGroup.create({
        id: 'postionControl',
        value: watermarkPostion,
        buttons: [{
          label: 'Bottom Right',
          value: 'lowerRight'
        }, {
          label: 'Bottom Left',
          value: 'lowerLeft'
        }, {
          label: 'Center',
          value: 'center'
        }]
      })]
    }), _editingExtensionsApi.TextInput.create({
      id: 'textControl',
      inputType: 'text',
      value: text,
      label: 'Text'
    }), _editingExtensionsApi.TextInput.create({
      id: 'sizeControl',
      inputType: 'text',
      value: size,
      label: 'Text'
    }), _editingExtensionsApi.Slider.create({
      id: 'opacityControl',
      label: 'Opacity',
      value: opacity,
      min: 0.0,
      max: 1.0,
      step: 0.1
    }), _editingExtensionsApi.ColorPicker.create({
      id: 'colorControl',
      label: 'Watermark Color',
      color
    })]
  })];
};

exports.renderSettings = renderSettings;
},{"@canva/editing-extensions-api":"node_modules/@canva/editing-extensions-api/dist/index.js"}],"events.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.controlsEventsHandler = controlsEventsHandler;

function controlsEventsHandler(event, state) {
  const {
    controlId: id,
    message: {
      value
    }
  } = event;

  if (id === 'postionControl') {
    return { ...state,
      watermarkPostion: value
    };
  }

  if (id === 'opacityControl') {
    return { ...state,
      opacity: value
    };
  }

  if (id === 'sizeControl') {
    return { ...state,
      size: value
    };
  }

  if (id === 'colorControl') {
    return { ...state,
      color: value
    };
  }

  if (id === 'textControl') {
    return { ...state,
      text: value
    };
  }

  return state;
}
},{}],"node_modules/watermarkjs/dist/watermark.js":[function(require,module,exports) {
var define;
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["watermark"] = factory();
	else
		root["watermark"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	__webpack_require__(1);
	module.exports = __webpack_require__(2).default;


/***/ },
/* 1 */
/***/ function(module, exports) {

	// required to safely use babel/register within a browserify codebase

	"use strict";

	exports.__esModule = true;

	exports["default"] = function () {};

	module.exports = exports["default"];

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.default = watermark;

	var _image = __webpack_require__(3);

	var _canvas = __webpack_require__(5);

	var _blob = __webpack_require__(6);

	var _style = __webpack_require__(7);

	var style = _interopRequireWildcard(_style);

	var _object = __webpack_require__(10);

	var _pool = __webpack_require__(11);

	var _pool2 = _interopRequireDefault(_pool);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	/**
	 * A configuration type for the watermark function
	 *
	 * @typedef {Object} Options
	 * @property {Function} init - an initialization function that is given Image objects before loading (only applies if resources is a collection of urls)
	 * @property {Number} poolSize - number of canvas elements available for drawing,
	 * @property {CanvasPool} pool - the pool used. If provided, poolSize will be ignored
	 */

	/**
	 * @constant
	 * @type {Options}
	 */
	var defaults = {
	  init: function init() {}
	};

	/**
	 * Merge the given options with the defaults
	 *
	 * @param {Options} options
	 * @return {Options}
	 */
	function mergeOptions(options) {
	  return (0, _object.extend)((0, _object.clone)(defaults), options);
	}

	/**
	 * Release canvases from a draw result for reuse. Returns
	 * the dataURL from the result's canvas
	 *
	 * @param {DrawResult} result
	 * @param {CanvasPool} pool
	 * @return  {String}
	 */
	function release(result, pool) {
	  var canvas = result.canvas;
	  var sources = result.sources;

	  var dataURL = (0, _canvas.dataUrl)(canvas);
	  sources.forEach(pool.release);
	  return dataURL;
	}

	/**
	 * Return a watermark object
	 *
	 *
	 * @param {Array} resources - a collection of urls, File objects, or Image objects
	 * @param {Options} options - a configuration object for watermark
	 * @param {Promise} promise - optional
	 * @return {Object}
	 */
	function watermark(resources) {
	  var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
	  var promise = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

	  var opts = mergeOptions(options);
	  promise || (promise = (0, _image.load)(resources, opts.init));

	  return {
	    /**
	     * Convert the watermarked image into a dataUrl. The draw
	     * function is given all images as canvas elements in order
	     *
	     * @param {Function} draw
	     * @return {Object}
	     */

	    dataUrl: function dataUrl(draw) {
	      var promise = this.then(function (images) {
	        return (0, _image.mapToCanvas)(images, _pool2.default);
	      }).then(function (canvases) {
	        return style.result(draw, canvases);
	      }).then(function (result) {
	        return release(result, _pool2.default);
	      });

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Load additional resources
	     *
	     * @param {Array} resources - a collection of urls, File objects, or Image objects
	     * @param {Function} init - an initialization function that is given Image objects before loading (only applies if resources is a collection of urls)
	     * @return {Object}
	     */
	    load: function load(resources, init) {
	      var promise = this.then(function (resource) {
	        return (0, _image.load)([resource].concat(resources), init);
	      });

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Render the current state of the watermarked image. Useful for performing
	     * actions after the watermark has been applied
	     *
	     * @return {Object}
	     */
	    render: function render() {
	      var promise = this.then(function (resource) {
	        return (0, _image.load)([resource]);
	      });

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Convert the watermark into a blob
	     *
	     * @param {Function} draw
	     * @return {Object}
	     */
	    blob: function blob(draw) {
	      var promise = this.dataUrl(draw).then(_blob.blob);

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Convert the watermark into an image using the given draw function
	     *
	     * @param {Function} draw
	     * @return {Object}
	     */
	    image: function image(draw) {
	      var promise = this.dataUrl(draw).then(_image.createImage);

	      return watermark(resources, opts, promise);
	    },

	    /**
	     * Delegate to the watermark promise
	     *
	     * @return {Promise}
	     */
	    then: function then() {
	      for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
	        funcs[_key] = arguments[_key];
	      }

	      return promise.then.apply(promise, funcs);
	    }
	  };
	};

	/**
	 * Style functions
	 */
	watermark.image = style.image;
	watermark.text = style.text;

	/**
	 * Clean up all canvas references
	 */
	watermark.destroy = function () {
	  return _pool2.default.clear();
	};

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.getLoader = getLoader;
	exports.load = load;
	exports.loadUrl = loadUrl;
	exports.loadFile = loadFile;
	exports.createImage = createImage;
	exports.imageToCanvas = imageToCanvas;
	exports.mapToCanvas = mapToCanvas;

	var _functions = __webpack_require__(4);

	function _typeof(obj) { return obj && typeof Symbol !== "undefined" && obj.constructor === Symbol ? "symbol" : typeof obj; }

	/**
	 * Set the src of an image object and call the resolve function
	 * once it has loaded
	 *
	 * @param {Image} img
	 * @param {String} src
	 * @param {Function} resolve
	 */
	function setAndResolve(img, src, resolve) {
	  img.onload = function () {
	    return resolve(img);
	  };
	  img.src = src;
	}

	/**
	 * Given a resource, return an appropriate loading function for it's type
	 *
	 * @param {String|File|Image} resource
	 * @return {Function}
	 */
	function getLoader(resource) {
	  var type = typeof resource === 'undefined' ? 'undefined' : _typeof(resource);

	  if (type === 'string') {
	    return loadUrl;
	  }

	  if (resource instanceof Image) {
	    return _functions.identity;
	  }

	  return loadFile;
	}

	/**
	 * Used for loading image resources asynchronously and maintaining
	 * the supplied order of arguments
	 *
	 * @param {Array} resources - a mixed array of urls, File objects, or Image objects
	 * @param {Function} init - called at the beginning of resource initialization
	 * @return {Promise}
	 */
	function load(resources, init) {
	  var promises = [];
	  for (var i = 0; i < resources.length; i++) {
	    var resource = resources[i];
	    var loader = getLoader(resource);
	    var promise = loader(resource, init);
	    promises.push(promise);
	  }
	  return Promise.all(promises);
	}

	/**
	 * Load an image by its url
	 *
	 * @param {String} url
	 * @param {Function} init - an optional image initializer
	 * @return {Promise}
	 */
	function loadUrl(url, init) {
	  var img = new Image();
	  typeof init === 'function' && init(img);
	  return new Promise(function (resolve) {
	    img.onload = function () {
	      return resolve(img);
	    };
	    img.src = url;
	  });
	}

	/**
	 * Return a collection of images from an
	 * array of File objects
	 *
	 * @param {File} file
	 * @return {Promise}
	 */
	function loadFile(file) {
	  var reader = new FileReader();
	  return new Promise(function (resolve) {
	    var img = new Image();
	    reader.onloadend = function () {
	      return setAndResolve(img, reader.result, resolve);
	    };
	    reader.readAsDataURL(file);
	  });
	}

	/**
	 * Create a new image, optionally configuring it's onload behavior
	 *
	 * @param {String} url
	 * @param {Function} onload
	 * @return {Image}
	 */
	function createImage(url, onload) {
	  var img = new Image();
	  if (typeof onload === 'function') {
	    img.onload = onload;
	  }
	  img.src = url;
	  return img;
	}

	/**
	 * Draw an image to a canvas element
	 *
	 * @param {Image} img
	 * @param {HTMLCanvasElement} canvas
	 * @return {HTMLCanvasElement}
	 */
	function drawImage(img, canvas) {
	  var ctx = canvas.getContext('2d');

	  canvas.width = img.width;
	  canvas.height = img.height;
	  ctx.drawImage(img, 0, 0);
	  return canvas;
	}

	/**
	 * Convert an Image object to a canvas
	 *
	 * @param {Image} img
	 * @param {CanvasPool} pool
	 * @return {HTMLCanvasElement}
	 */
	function imageToCanvas(img, pool) {
	  var canvas = pool.pop();
	  return drawImage(img, canvas);
	}

	/**
	 * Convert an array of image objects
	 * to canvas elements
	 *
	 * @param {Array} images
	 * @param {CanvasPool} pool
	 * @return {HTMLCanvasElement[]}
	 */
	function mapToCanvas(images, pool) {
	  return images.map(function (img) {
	    return imageToCanvas(img, pool);
	  });
	}

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.sequence = sequence;
	exports.identity = identity;
	/**
	 * Return a function that executes a sequence of functions from left to right,
	 * passing the result of a previous operation to the next
	 *
	 * @param {...funcs}
	 * @return {Function}
	 */
	function sequence() {
	  for (var _len = arguments.length, funcs = Array(_len), _key = 0; _key < _len; _key++) {
	    funcs[_key] = arguments[_key];
	  }

	  return function (value) {
	    return funcs.reduce(function (val, fn) {
	      return fn.call(null, val);
	    }, value);
	  };
	}

	/**
	 * Return the argument passed to it
	 *
	 * @param {Mixed} x
	 * @return {Mixed}
	 */
	function identity(x) {
	  return x;
	}

/***/ },
/* 5 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.dataUrl = dataUrl;
	/**
	 * Get the data url of a canvas
	 *
	 * @param {HTMLCanvasElement}
	 * @return {String}
	 */
	function dataUrl(canvas) {
	  return canvas.toDataURL();
	}

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.blob = undefined;
	exports.split = split;
	exports.decode = decode;
	exports.uint8 = uint8;

	var _functions = __webpack_require__(4);

	var url = /^data:([^;]+);base64,(.*)$/;

	/**
	 * Split a data url into a content type and raw data
	 *
	 * @param {String} dataUrl
	 * @return {Array}
	 */
	function split(dataUrl) {
	  return url.exec(dataUrl).slice(1);
	}

	/**
	 * Decode a base64 string
	 *
	 * @param {String} base64
	 * @return {String}
	 */
	function decode(base64) {
	  return window.atob(base64);
	}

	/**
	 * Return a string of raw data as a Uint8Array
	 *
	 * @param {String} data
	 * @return {UInt8Array}
	 */
	function uint8(data) {
	  var length = data.length;
	  var uints = new Uint8Array(length);

	  for (var i = 0; i < length; i++) {
	    uints[i] = data.charCodeAt(i);
	  }

	  return uints;
	}

	/**
	 * Turns a data url into a blob object
	 *
	 * @param {String} dataUrl
	 * @return {Blob}
	 */
	var blob = exports.blob = (0, _functions.sequence)(split, function (parts) {
	  return [decode(parts[1]), parts[0]];
	}, function (blob) {
	  return new Blob([uint8(blob[0])], { type: blob[1] });
	});

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.text = exports.image = undefined;
	exports.result = result;

	var _image = __webpack_require__(8);

	var img = _interopRequireWildcard(_image);

	var _text = __webpack_require__(9);

	var txt = _interopRequireWildcard(_text);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	/**
	 * @typedef {Object} DrawResult
	 * @property {HTMLCanvasElement} canvas - the end result of a draw
	 * @property {HTMLCanvasElement[]} sources - the sources used in the draw
	 */

	var image = exports.image = img;
	var text = exports.text = txt;

	/**
	 * Create a DrawResult by apply a list of canvas elements to a draw function
	 *
	 * @param {Function} draw - the draw function used to create a DrawResult
	 * @param {HTMLCanvasElement} sources - the canvases used by the draw function
	 * @return {DrawResult}
	 */
	function result(draw, sources) {
	  var canvas = draw.apply(null, sources);
	  return {
	    canvas: canvas,
	    sources: sources
	  };
	}

/***/ },
/* 8 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.atPos = atPos;
	exports.lowerRight = lowerRight;
	exports.upperRight = upperRight;
	exports.lowerLeft = lowerLeft;
	exports.upperLeft = upperLeft;
	exports.center = center;
	/**
	 * Return a function for positioning a watermark on a target canvas
	 *
	 * @param {Function} xFn - a function to determine an x value
	 * @param {Function} yFn - a function to determine a y value
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function atPos(xFn, yFn, alpha) {
	  alpha || (alpha = 1.0);
	  return function (target, watermark) {
	    var context = target.getContext('2d');
	    context.save();

	    context.globalAlpha = alpha;
	    context.drawImage(watermark, xFn(target, watermark), yFn(target, watermark));

	    context.restore();
	    return target;
	  };
	}

	/**
	 * Place the watermark in the lower right corner of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function lowerRight(alpha) {
	  return atPos(function (target, mark) {
	    return target.width - (mark.width + 10);
	  }, function (target, mark) {
	    return target.height - (mark.height + 10);
	  }, alpha);
	}

	/**
	 * Place the watermark in the upper right corner of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function upperRight(alpha) {
	  return atPos(function (target, mark) {
	    return target.width - (mark.width + 10);
	  }, function (target, mark) {
	    return 10;
	  }, alpha);
	}

	/**
	 * Place the watermark in the lower left corner of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function lowerLeft(alpha) {
	  return atPos(function (target, mark) {
	    return 10;
	  }, function (target, mark) {
	    return target.height - (mark.height + 10);
	  }, alpha);
	}

	/**
	 * Place the watermark in the upper left corner of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function upperLeft(alpha) {
	  return atPos(function (target, mark) {
	    return 10;
	  }, function (target, mark) {
	    return 10;
	  }, alpha);
	}

	/**
	 * Place the watermark in the center of the target
	 * image
	 *
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function center(alpha) {
	  return atPos(function (target, mark) {
	    return (target.width - mark.width) / 2;
	  }, function (target, mark) {
	    return (target.height - mark.height) / 2;
	  }, alpha);
	}

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.atPos = atPos;
	exports.lowerRight = lowerRight;
	exports.lowerLeft = lowerLeft;
	exports.upperRight = upperRight;
	exports.upperLeft = upperLeft;
	exports.center = center;
	/**
	 * Return a function for positioning a watermark on a target canvas
	 *
	 * @param {Function} xFn - a function to determine an x value
	 * @param {Function} yFn - a function to determine a y value
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha
	 * @return {Function}
	 */
	function atPos(xFn, yFn, text, font, fillStyle, alpha) {
	  alpha || (alpha = 1.0);
	  return function (target) {
	    var context = target.getContext('2d');
	    context.save();

	    context.globalAlpha = alpha;
	    context.fillStyle = fillStyle;
	    context.font = font;
	    var metrics = context.measureText(text);
	    context.fillText(text, xFn(target, metrics, context), yFn(target, metrics, context));

	    context.restore();
	    return target;
	  };
	}

	/**
	 * Write text to the lower right corner of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function lowerRight(text, font, fillStyle, alpha, y) {
	  return atPos(function (target, metrics) {
	    return target.width - (metrics.width + 10);
	  }, function (target) {
	    return y || target.height - 10;
	  }, text, font, fillStyle, alpha);
	}

	/**
	 * Write text to the lower left corner of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function lowerLeft(text, font, fillStyle, alpha, y) {
	  return atPos(function () {
	    return 10;
	  }, function (target) {
	    return y || target.height - 10;
	  }, text, font, fillStyle, alpha);
	}

	/**
	 * Write text to the upper right corner of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function upperRight(text, font, fillStyle, alpha, y) {
	  return atPos(function (target, metrics) {
	    return target.width - (metrics.width + 10);
	  }, function () {
	    return y || 20;
	  }, text, font, fillStyle, alpha);
	}

	/**
	 * Write text to the upper left corner of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function upperLeft(text, font, fillStyle, alpha, y) {
	  return atPos(function () {
	    return 10;
	  }, function () {
	    return y || 20;
	  }, text, font, fillStyle, alpha);
	}

	/**
	 * Write text to the center of the target canvas
	 *
	 * @param {String} text - the text to write
	 * @param {String} font - same as the CSS font property
	 * @param {String} fillStyle
	 * @param {Number} alpha - control text transparency
	 * @param {Number} y - height in text metrics is not very well supported. This is a manual value
	 * @return {Function}
	 */
	function center(text, font, fillStyle, alpha, y) {
	  return atPos(function (target, metrics, ctx) {
	    ctx.textAlign = 'center';return target.width / 2;
	  }, function (target, metrics, ctx) {
	    ctx.textBaseline = 'middle';return target.height / 2;
	  }, text, font, fillStyle, alpha);
	}

/***/ },
/* 10 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.extend = extend;
	exports.clone = clone;
	/**
	 * Extend one object with the properties of another
	 *
	 * @param {Object} first
	 * @param {Object} second
	 * @return {Object}
	 */
	function extend(first, second) {
	  var secondKeys = Object.keys(second);
	  secondKeys.forEach(function (key) {
	    return first[key] = second[key];
	  });
	  return first;
	}

	/**
	 * Create a shallow copy of the object
	 *
	 * @param {Object} obj
	 * @return {Object}
	 */
	function clone(obj) {
	  return extend({}, obj);
	}

/***/ },
/* 11 */
/***/ function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.CanvasPool = CanvasPool;
	/**
	 * An immutable canvas pool allowing more efficient use of canvas resources
	 *
	 * @typedef {Object} CanvasPool
	 * @property {Function} pop - return a promise that will evaluate to a canvas
	 * @property {Number} length - the number of available canvas elements
	 * @property {HTMLCanvasElement[]} elements - the canvas elements used by the pool
	 * @property {Function} clear - empty the pool of canvas elements
	 * @property {Function} release - free a pool up for release and return the data url
	 */

	/**
	 * Create a CanvasPool with the given size
	 *
	 * @param {Number} size
	 * @param {HTMLCanvasElement[]} elements
	 * @param {EventEmitter} eventEmitter
	 * @return {CanvasPool}
	 */
	function CanvasPool() {
	  var canvases = [];

	  return {
	    /**
	     * Get the next available canvas from the pool
	     *
	     * @return {HTMLCanvasElement}
	     */

	    pop: function pop() {
	      if (this.length === 0) {
	        canvases.push(document.createElement('canvas'));
	      }

	      return canvases.pop();
	    },

	    /**
	     * Return the number of available canvas elements in the pool
	     *
	     * @return {Number}
	     */
	    get length() {
	      return canvases.length;
	    },

	    /**
	     * Return a canvas to the pool. This function will clear the canvas for reuse
	     *
	     * @param {HTMLCanvasElement} canvas
	     * @return {String}
	     */
	    release: function release(canvas) {
	      var context = canvas.getContext('2d');
	      context.clearRect(0, 0, canvas.width, canvas.height);
	      canvases.push(canvas);
	    },

	    /**
	     * Empty the pool, destroying any references to canvas objects
	     */
	    clear: function clear() {
	      canvases.splice(0, canvases.length);
	    },

	    /**
	     * Return the collection of canvases in the pool
	     *
	     * @return {HTMLCanvasElement[]}
	     */
	    get elements() {
	      return canvases;
	    }
	  };
	}

	var shared = CanvasPool();
	exports.default = shared;

/***/ }
/******/ ])
});
;
},{}],"index.js":[function(require,module,exports) {
"use strict";

var _editingExtensionsApi = require("@canva/editing-extensions-api");

var _controls = require("./controls");

var _events = require("./events");

var _watermarkjs = _interopRequireDefault(require("watermarkjs"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let state = {
  watermarkPostion: 'lowerRight',
  opacity: 0.7,
  color: "#ffffff",
  size: 20,
  text: '© Canva Apps'
};
let prevState = state;
let context;
let canvas;

_editingExtensionsApi.CanvaApiClient.initialize(async canva => {
  function renderControls() {
    canva.updateControlPanel(_editingExtensionsApi.Page.create({
      controls: [...(0, _controls.renderSettings)(state)]
    }));
  }

  ;

  async function render(state) {
    console.log("IN RENDER: STATE: ", state);
    renderControls(state);
    const {
      opts,
      watermarkPostion,
      opacity,
      color,
      size,
      text
    } = state;
    console.log({
      watermarkPostion
    });
    let image;

    if (!state.image) {
      image = await _editingExtensionsApi.CanvaImage.toImageElement(opts.image);
    }

    (0, _watermarkjs.default)([image]).image(_watermarkjs.default.text[watermarkPostion](text, `${size}px Josefin Slab`, color, opacity)).then(function (image) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      state = { ...state,
        image
      };
    });
  }

  setInterval(() => {
    if (prevState !== state) {
      console.info("State: ", {
        state,
        prevState
      });
      render(state);
      prevState = state;
    }
  }, 200);
  canva.onReady(async opts => {
    state = { ...state,
      opts
    };
    const {
      image
    } = opts;
    canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
    context = canvas.getContext('2d');
    render(state);
    canva.onControlsEvent(async event => {
      console.log({
        event,
        state
      });
      state = (0, _events.controlsEventsHandler)(event, state);
    });
  });
  const {
    image
  } = state;
  canva.onSaveRequest(async () => image);
});
},{"@canva/editing-extensions-api":"node_modules/@canva/editing-extensions-api/dist/index.js","./controls":"controls.js","./events":"events.js","watermarkjs":"node_modules/watermarkjs/dist/watermark.js"}],"../../../../usr/local/lib/node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "59062" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../../../usr/local/lib/node_modules/parcel-bundler/src/builtins/hmr-runtime.js","index.js"], null)
//# sourceMappingURL=/editing-quick-start.e31bb0bc.js.map
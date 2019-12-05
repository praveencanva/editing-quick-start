import { CanvaApiClient, Page, CanvaImage } from '@canva/editing-extensions-api';
import { renderSettings } from './controls';
import { controlsEventsHandler } from './events';
import watermark from 'watermarkjs';

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

CanvaApiClient.initialize(async canva => {
        
    function renderControls() {
        canva.updateControlPanel(
            Page.create({
                controls: [...renderSettings(state)],
            }),
        );
    };

    async function render(state){
        console.log("IN RENDER: STATE: ", state);

        renderControls(state);
        const {opts, watermarkPostion, opacity, color, size, text} = state;
        console.log({watermarkPostion});
        let image;
        if(!state.image){
            image =  await CanvaImage.toImageElement(opts.image);
        }
       
    
        watermark([image])
            .image(watermark.text[watermarkPostion](text, `${size}px Josefin Slab`, color, opacity))
            .then(function(image) {
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                state = {...state, image};
            });
    }

    setInterval(() => {
        if (prevState !== state) {
            console.info("State: ", {state, prevState});
            render(state);
            prevState = state;
        }
    }, 200);

    
    canva.onReady(async opts => {
        state = {...state, opts};
        const {image} =  opts;
        canvas = document.createElement('canvas');
    
        canvas.width = image.width;
        canvas.height = image.height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    
        document.body.appendChild(canvas);
        context = canvas.getContext('2d');
        render(state);
        canva.onControlsEvent(async event => {
            console.log({event, state});
            state = controlsEventsHandler(event, state);
        });
    });

    const {image} = state;
    canva.onSaveRequest(async () => image);
});

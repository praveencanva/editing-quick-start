export function controlsEventsHandler(event, state) {
    const {
        controlId: id,
        message: { value },
    } = event;

    if (id === 'postionControl') {
        return { ...state, watermarkPostion: value };
    }

    if (id === 'opacityControl') {
        return { ...state, opacity: value };
    }

    if (id === 'sizeControl') {
        return { ...state, size: value };
    }

    if (id === 'colorControl') {
        return { ...state, color: value };
    }

    if (id === 'textControl') {
        return { ...state, text: value };
    }

    return state;
}

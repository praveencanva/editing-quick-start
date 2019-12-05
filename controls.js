import { Paragraph, Group, RadioGroup, Slider, ColorPicker, TextInput } from '@canva/editing-extensions-api';

export const renderSettings = state => {
    const { text, watermarkPostion, size, color, opacity } = state;
    return [
        Paragraph.create({
            id: 'paragraph',
            text: 'Provide copyright watermark on your protected images.',
        }),
        Group.create({
            id: 'settingsGroup',
            label: 'Settings',
            children: [
                Group.create({
                    id: 'postionRadioGroup',
                    label: 'Postion',
                    children: [
                        RadioGroup.create({
                            id: 'postionControl',
                            value: watermarkPostion,
                            buttons: [
                                {
                                    label: 'Bottom Right',
                                    value: 'lowerRight',
                                },
                                {
                                    label: 'Bottom Left',
                                    value: 'lowerLeft',
                                },
                                {
                                    label: 'Center',
                                    value: 'center',
                                },
                            ],
                        }),
                    ],
                }),
                TextInput.create({
                    id: 'textControl',
                    inputType: 'text',
                    value: text,
                    label: 'Text',
                }),

                TextInput.create({
                    id: 'sizeControl',
                    inputType: 'text',
                    value: size,
                    label: 'Text',
                }),

                Slider.create({
                    id: 'opacityControl',
                    label: 'Opacity',
                    value: opacity,
                    min: 0.0,
                    max: 1.0,
                    step: 0.1,
                }),
                ColorPicker.create({
                    id: 'colorControl',
                    label: 'Watermark Color',
                    color,
                }),
            ],
        }),
    ];
};

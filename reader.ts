import { createWorker } from 'tesseract.js';

const FILEPATH = "./example/SampleOrderPage1.png"

let reader = async (filepath: string): Promise<string> => {
    
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(filepath);
    console.log(text);
    await worker.terminate();

    return text
}

reader(FILEPATH)
    .then((result) => {
        console.log('OCR Result:', result);
    })
    .catch((error) => {
        console.error('OCR Error:', error);
    });


import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as dfd from "danfojs"

const FILEPATH = "./example/SampleOrderPage1.png"
const TEXT = fs.readFileSync('./example/example.txt', 'utf-8');

// desired data structure for orders 
class Order {
    identifier: string //required field
    num_samples: number; //required field (default 1)
    sample_1_identifier: string //required field
    sample_1_group_name: string //required field
    sample_1_state_position: string //required field
    sample_1_container_type: string //required field
    sample_collection_date: Date;
    test_panel_code: string;
    sample_1_collected_by: string;
    sample_1_date_received: Date;
    sample_1_state_label: string;
    sample_1_container_barcode: string;
    patient_first_name: string;
    patient_last_name: string;
    patient_date_of_birth: Date;
    patient_sex: string;
    provider_account: string;
    license_registry: string;
    provider_npi: string;
    patient_mrn: string;
    patient_middle_name: string;
    patient_street_address: string;
    patient_street_address_line2: string;	
    patient_city: string;
    patient_state: string;
    patient_country: string;
    patient_zip_code: string;
    patient_phone_number: string;
    patient_ethnicity: string;
    patient_race: string;
    patient_email: string;
    provider_name: string;

    constructor(barcode: string) {
        const identifier: string = "NS-" + barcode
        // required:
        this.identifier = identifier;
        this.num_samples = 1;
        this.sample_1_identifier = identifier;
        this.sample_1_group_name = "Sendout";
        this.sample_1_state_position = "A01";
        this.sample_1_container_type = "Tube";

        // optional:
        this.sample_1_container_barcode = barcode
    }

    convertToCSV() {
        // todo
    }
}

// converts fax to text with tesseract

let reader = async (filePath: string): Promise<string> => {
    
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(FILEPATH);
    console.log(text);
    await worker.terminate();

    return text;
}

reader(FILEPATH)
    .then((result) => {
        console.log('OCR Result:', result);
    })
    .catch((error) => {
        console.error('OCR Error:', error);
    }); 

function parser(rawText: string): Order {
    let output = new Order("0000")

    let lines = rawText.split('\n');
    lines.forEach((line, index) => {
        if (line.includes("order date")) {
            let sample_collection_date: Date = new Date(line.split(":")[1])
            output.sample_collection_date = sample_collection_date
        } else if (line.includes("DOB")){
            let patient_date_of_birth: Date = new Date(line.split(":")[1].trim().split(" ")[0])
            output.patient_date_of_birth = patient_date_of_birth
            let name: string = lines[index - 1].split("(")[0]
            output.patient_first_name = name.split(",")[0].trim()
            output.patient_last_name = name.split(",")[1].trim()
        }
    });
    return output;
}

function 
console.log(parser(TEXT))
import { createWorker } from 'tesseract.js';
import * as fs from 'fs';
import * as dfd from "danfojs"

const FILEPATH = "./example/SampleOrderPage1.png"
const TEXT = fs.readFileSync('./example/example.txt', 'utf-8');

// desired data structure for orders 
class Order {
    identifier: string; //required field
    num_samples: number; //required field (default 1)
    sample_1_identifier: string; //required field
    sample_1_group_name: string; //required field
    sample_1_state_position: string; //required field
    sample_1_container_type: string; //required field
    sample_collection_date?: Date;
    test_panel_code?: string; 
    sample_1_collected_by?: string;
    sample_1_date_receive?: Date;
    sample_1_state_label?: string;
    sample_1_container_barcode?: string;
    patient_first_name?: string;
    patient_last_name?: string;
    patient_date_of_birth?: Date;
    patient_sex?: string;
    provider_account?: string;
    license_registry?: string;
    provider_npi?: string;
    patient_mrn?: string;
    patient_middle_name?: string;
    patient_street_address?: string;
    patient_street_address_line2?: string;	
    patient_city?: string;
    patient_state?: string;
    patient_country?: string;
    patient_zip_code?: string;
    patient_phone_number?: string;
    patient_ethnicity?: string;
    patient_race?: string;
    patient_email?: string;
    provider_name?: string;

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
        this.test_panel_code ="LGRA"
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

    await worker.terminate();

    return text;
}

function parser(rawText: string): Order {
    let output = new Order("0000")

    let lines = rawText.split('\n');
    lines.forEach((line, index) => {
        // extract order date ( = collection date??)
        if (line.includes("order date")) {
            let sample_collection_date: Date = new Date(line.split(":")[1])
            output.sample_collection_date = sample_collection_date

        // extract pt bio info (DOB, gender, name)
        } else if (line.includes("DOB")) {
            let patient_date_of_birth: Date = new Date(line.split(":")[1].trim().split(" ")[0])
            output.patient_date_of_birth = patient_date_of_birth
            output.patient_sex = line.split(":")[1].trim().split(" ")[1]
            let name: string = lines[index - 1].split("(")[0]
            output.patient_first_name = name.split(",")[0].trim()
            output.patient_last_name = name.split(",")[1].trim()

        // extract pt cell phone number (collecting cell instead of home) 
        } else if (line.includes("cell")) {
            output.patient_phone_number = line.split(" ")[1].trim()

        // extract pt email address
        } else if (line.includes("mail")) {
            output.patient_email = line.split(":")[1].trim()
        
        } else if (line.includes("ethnicity")){
            //TBD
        // extract provider info 
        } else if (line.toLowerCase().includes("physician")) {
            let matches = line.match(/\b\d{10}\b/)
            if (matches) {
                output.license_registry = "NPI"
                output.provider_npi = matches[0]
            }
        }
    });
    return output;
}

console.log(parser(TEXT))
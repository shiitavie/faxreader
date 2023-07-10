import { createWorker } from 'tesseract.js';
import * as fs from 'fs';

const FAXDIR = "./fax";
const TEXT = fs.readFileSync('./example/example.txt', 'utf-8');

// desired data structure for orders 
interface OrderData {
    identifier: string; //required field
    num_samples: number; //required field (default 1)
    sample_1_identifier: string; //required field
    sample_1_group_name: string; //required field
    sample_1_state_position: string; //required field
    sample_1_container_type: string; //required field
    sample_collection_date?: Date | string;
    test_panel_code?: string;
    sample_1_collected_by?: string;
    sample_1_date_received?: Date | string;
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
}

class Order {
    dataFields: OrderData;

    constructor(barcode: string) {
        const identifier: string = "NS-" + barcode;
        let newOrderData: OrderData = {
            // required:
            identifier: identifier,
            num_samples: 1,
            sample_1_identifier: identifier,
            sample_1_group_name: "Sendout",
            sample_1_state_position: "A01",
            sample_1_container_type: "Tube",
            // optional:
            sample_1_container_barcode: barcode,
            test_panel_code: "LGRA",
            sample_collection_date: new Date(Date.now()), //default now?
            sample_1_date_received: '' //init empty date
        };

        this.dataFields = newOrderData;
    }

    headerToCsv(): string {
        const separator = ',';
        const keys = Object.keys(this.dataFields);
        const header = keys.join(separator) + '\n';
        return header;
    }

    dataToCsv(): string {
        const keys = Object.keys(this.dataFields);
        return keys.map(k => {
            let cell: any = this.dataFields[k as keyof OrderData];
            let cellString: string = cell instanceof Date
                ? cell.toISOString()
                : cell.toString();
            return cellString;
        }).join(",") + '\n';
    }
}

// converts fax to text with tesseract

async function reader(dir: string): Promise<string> {
    const filenames: string[] = await new Promise((resolve, reject) => {
        fs.readdir(dir, (error, filenames) => {
            if (error) {
                reject(error);
            } else {
                resolve(filenames);
            }
        });
    });

    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    let output = '';
    for (let i = 0; i < filenames.length; i++) {
        let { data: { text } } = await worker.recognize(FAXDIR + '/' + filenames[i]);
        output += text + '\n';
    }

    await worker.terminate();

    return output;

};

function parser(rawText: string): Order {
    let output = new Order("0000");

    let lines = rawText.split('\n');
    lines.forEach((line, index) => {
        // extract order date ( = collection date??)
        if (line.includes("order date")) {
            let sample_collection_date: Date =
                new Date(Date.parse(line.split(":")[1] + " GMT"));
            output.dataFields["sample_collection_date"] = sample_collection_date;

            // extract pt bio info (DOB, gender, name)
        } else if (line.includes("DOB")) {
            let patient_date_of_birth: Date =
                new Date(Date.parse(
                    line.split(":")[1].trim().split(" ")[0] + " GMT"
                ));
            output.dataFields["patient_date_of_birth"] = patient_date_of_birth;
            output.dataFields["patient_sex"] = line.split(":")[1].trim().split(" ")[1];
            let name: string = lines[index - 1].split("(")[0];
            output.dataFields["patient_first_name"] = name.split(",")[0].trim();
            output.dataFields["patient_last_name"] = name.split(",")[1].trim();

            // extract pt cell phone number (collecting cell instead of home) 
        } else if (line.includes("cell")) {
            output.dataFields["patient_phone_number"] = line.split(" ")[1].trim();

            // extract pt email address
        } else if (line.includes("mail")) {
            output.dataFields["patient_email"] = line.split(":")[1].trim();

        } else if (line.includes("ethnicity")) {
            //TBD
            // extract provider info 
        } else if (line.toLowerCase().includes("physician")) {
            let matches = line.match(/\b\d{10}\b/);
            if (matches) {
                output.dataFields["license_registry"] = "NPI";
                output.dataFields["provider_npi"] = matches[0];
            }
        }
    });
    return output;
}

function convertToCsv(orders: Order[]) {
    if (orders.length < 1) {
        return;
    }
    let content = orders[0].headerToCsv();
    content += orders.map(order => order.dataToCsv()).join();
    fs.writeFile('upload_orders.csv', content, function (err) {
        if (err) throw err;
        console.log('Saved!');
    });
}

reader(FAXDIR)
    .then((text) => {
        console.log(text);
        const parsed = parser(text);
        convertToCsv([parsed]);
    })
    .catch((error) => {
        console.error('OCR Error:', error);
    });
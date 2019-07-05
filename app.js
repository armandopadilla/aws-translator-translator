const AWS = require('aws-sdk');
const _ = require('lodash');

const AWS_ACCESS_KEY = '';
const AWS_SECRET_KEY = '';
const AWS_REGION = 'us-west-2';

const connParams = {
    accessKeyId: AWS_ACCESS_KEY,
    secretAccessKey: AWS_SECRET_KEY,
    region: AWS_REGION
}

const doTranslation = (textToTranslate) => {

    const AWSTranslate = new AWS.Translate(connParams);

    AWSTranslate
        .translateText({
            SourceLanguageCode: 'en',
            TargetLanguageCode: 'es',
            Text: textToTranslate
        })
        .promise()
        .then((results) => {
            const translatedText = _.get(results, 'TranslatedText', 'Could not Translate');
            console.log(translatedText)
        })
        .catch((error) => console.error(error))
}


// Pull data from S3 speech_to_text bucket and translate.
const S3 = new AWS.S3(connParams);

S3
    .getObject({
        Bucket: 'armando-aws-translator-speech-to-text-results',
        Key: 'hello_to_text2.json'
    })
    .promise()
    .then((results) => {
        const data = _.get(results, 'Body');
        const dataAsString = new Buffer(data).toString();
        const dataAsJSON = JSON.parse(dataAsString);

        return _.get(dataAsJSON, 'results.transcripts[0].transcript');
    })
    .then((textToTranslate) => doTranslation(textToTranslate))
    .catch((error) => console.error(error));



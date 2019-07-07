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


/**
 * AWS Translate Service Invocation.
 *
 **/
const doTranslation = (textToTranslate) => {
    console.log("Text to translate", textToTranslate);

    if (!textToTranslate) return;

    const AWSTranslate = new AWS.Translate(connParams);

    return AWSTranslate
        .translateText({
            SourceLanguageCode: 'en',
            TargetLanguageCode: 'es',
            Text: textToTranslate
        })
        .promise()
        .then((results) => {
            const translatedText = _.get(results, 'TranslatedText', 'Could not Translate');
            console.log("translated text", translatedText)
            return translatedText;

        })
        .catch((error) => console.error(error))
}


exports.handler = async (event) => {

    if (!event) return {
        statusCode: 400,
        body: JSON.stringify('Error. No payload.')
    }

    const record = _.get(event, 'Records[0]');
    if (!record)  return {
        statusCode: 400,
        body: JSON.stringify('Error. Not Record provided.')
    }

    const { bucket, object } = _.get(record, 's3');
    const inputBucketName = bucket.name;
    const fileName = object.key;

    console.log("bucketName", inputBucketName);
    console.log("fileName", fileName);

    // Pull data from S3 speech_to_text bucket and translate.
    const S3 = new AWS.S3(connParams);

    return S3.getObject({
            Bucket: inputBucketName,
            Key: fileName
        })
        .promise()
        .then((results) => {
            const data = _.get(results, 'Body');
            const dataAsString = new Buffer(data).toString();
            const dataAsJSON = JSON.parse(dataAsString);

            return _.get(dataAsJSON, 'results.transcripts[0].transcript');
        })
        .then((textToTranslate) => doTranslation(textToTranslate))
        .then((translatedText) => {
            console.log("Translated data to save", translatedText);

            // Save the output to S3 Bucket
            const destinationBucket = 'armando-aws-translator-translation-results'

            return S3.putObject({
                Body: JSON.stringify({ text: translatedText }),
                Bucket: destinationBucket,
                Key: fileName,
            }).promise()
        })
        .then(() => ({
               statusCode: 200,
               body: JSON.stringify(`Translate Job - ${fileName} DONE`)
             })
        )
        .catch((error) => {
            console.error(error);

            return {
              statusCode: 400,
              body: JSON.stringify(`Error - ${error.message}`)
            }
        })
};



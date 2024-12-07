import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { SQSHandler } from "aws-lambda";
import { GetObjectCommand, GetObjectCommandInput, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client();
const dynamoDB = new DynamoDBClient({});
const tableName = process.env.TABLE_NAME;

export const handler: SQSHandler = async (event) => {
  console.log("Event ", JSON.stringify(event));

  for (const record of event.Records) {
    const recordBody = JSON.parse(record.body);
    const snsMessage = JSON.parse(recordBody.Message);

    if (snsMessage.Records) {
      console.log("Record body ", JSON.stringify(snsMessage));
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
        const fileExtension = srcKey.split('.').pop()?.toLowerCase();

        if (fileExtension !== "jpeg" && fileExtension !== "png") {
          throw new Error(`Invalid file type: ${fileExtension}`);
        }

        try {
          const params: GetObjectCommandInput = {
            Bucket: srcBucket,
            Key: srcKey,
          };
          await s3.send(new GetObjectCommand(params));

          await dynamoDB.send(
            new PutItemCommand({
              TableName: tableName,
              Item: {
                fileName: { S: srcKey },
              },
            })
          );
          console.log(`Logged ${srcKey} to DynamoDB`);
        } catch (error) {
          console.log("Error processing image:", error);
        }
      }
    }
  }
};
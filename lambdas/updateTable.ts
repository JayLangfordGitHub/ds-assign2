import { SNSHandler } from "aws-lambda";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.REGION }));

export const handler: SNSHandler = async (event) => {
  console.log("SNS Event: ", JSON.stringify(event));

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.Sns.Message);
      const metadataType = record.Sns.MessageAttributes?.metadata_type?.Value;

      if (!["Caption", "Date", "Photographer"].includes(metadataType)) {
        console.error(`Invalid metadata type: ${metadataType}`);
        continue;
      }

      if (!message.id || !message.value) {
        console.error(`Invalid message format: ${JSON.stringify(message)}`);
        continue;
      }

      await ddbClient.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: { fileName: message.id },
          UpdateExpression: "SET #attr = :value",
          ExpressionAttributeNames: { "#attr": metadataType },
          ExpressionAttributeValues: { ":value": message.value },
        })
      );
      console.log(`Successfully updated metadata: ${metadataType} for ${message.id}`);
    } catch (error) {
      console.error("Error processing SNS message: ", error);
    }
  }
};
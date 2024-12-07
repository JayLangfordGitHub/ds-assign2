import { DynamoDBStreamHandler } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.SES_REGION });
const fromEmail = process.env.SES_EMAIL_FROM;
const toEmail = process.env.SES_EMAIL_TO;

export const handler: DynamoDBStreamHandler = async (event) => {
  console.log("DynamoDB Stream Event: ", JSON.stringify(event));

  if (!fromEmail || !toEmail) {
    console.error("Missing SES_EMAIL_FROM or SES_EMAIL_TO environment variables.");
    return;
  }

  for (const record of event.Records) {
    if (record.eventName === "INSERT") {
      const newImage = record.dynamodb?.NewImage;

      const fileName = newImage?.fileName?.S;
      const caption = newImage?.Caption?.S || "No caption provided";
      const message = `A new image (${fileName}) was uploaded with caption: ${caption}`;

      const params = {
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Body: { Text: { Data: message } },
          Subject: { Data: "New Image Added to DynamoDB" },
        },
        Source: fromEmail,
      };

      try {
        await ses.send(new SendEmailCommand(params));
        console.log("Confirmation email sent successfully.");
      } catch (error) {
        console.error("Error sending confirmation email:", error);
      }
    }
  }
};
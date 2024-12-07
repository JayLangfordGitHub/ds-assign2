import { SQSHandler } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";

const ses = new SESClient({ region: SES_REGION });

export const handler: SQSHandler = async (event) => {
  console.log("DLQ Event: ", JSON.stringify(event));

  for (const record of event.Records) {
    const errorMessage = record.body;

    const params = {
      Destination: { ToAddresses: [SES_EMAIL_TO] },
      Message: {
        Body: {
          Text: {
            Data: `Your file was rejected: ${errorMessage}`,
          },
        },
        Subject: { Data: "File Upload Rejected" },
      },
      Source: SES_EMAIL_FROM,
    };

    try {
      await ses.send(new SendEmailCommand(params));
      console.log("Rejection email sent successfully.");
    } catch (error) {
      console.error("Error sending rejection email:", error);
    }
  }
};
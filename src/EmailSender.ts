import * as brevo from "@getbrevo/brevo"
import { Params } from './interfaces/interfaces';


const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY as string
);


export async function SendEmail({ subject, to, senderemail, htmlContent, }: Params) {
    try {
        const smtpEmail = new brevo.SendSmtpEmail();
        smtpEmail.subject = subject;
        (smtpEmail.to = to);
        smtpEmail.htmlContent = htmlContent;
        smtpEmail.sender = { name: "HUB-Unitec", email: senderemail };
        await apiInstance.sendTransacEmail(smtpEmail);
    } catch (error) {
        console.error(error);
    }
}

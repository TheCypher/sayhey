import { getMailtrapToken } from "@/lib/auth/env";

const Nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");

const TOKEN = getMailtrapToken();

const transport = Nodemailer.createTransport(
  MailtrapTransport({
    token: TOKEN,
  })
);

const sender = {
  address: "hello@sayhey.cc",
  name: "Mailtrap Test",
};

export async function sendMagicLinkEmail(email: string, magicLink: string) {
  return transport.sendMail({
    from: sender,
    to: [email],
    subject: "Your sign-in link for Say hey",
    text: [
      "Let's get you signed in.",
      `Sign in link: ${magicLink}`,
      "If you didn't request this email, you can safely ignore it.",
    ].join("\n"),
    html: `
      <div style="background:#f6f1ea;padding:40px 20px;font-family:'Space Grotesk','Helvetica Neue',Arial,sans-serif;color:#1c1915;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px 28px;text-align:center;box-shadow:0 20px 50px rgba(20,14,10,0.12);">
          <div style="font-size:22px;font-weight:600;margin-bottom:6px;">Let's get you signed in</div>
          <div style="font-size:14px;color:#6f675f;margin-bottom:24px;">
            Sign in with the secure link below.
          </div>
          <a href="${magicLink}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#0f0d0b;color:#fff;text-decoration:none;font-size:14px;font-weight:600;">
            Sign in to Say hey
          </a>
          <div style="font-size:12px;color:#8a8078;margin-top:20px;">
            If you didn't request this email, you can safely ignore it.
          </div>
        </div>
      </div>
    `,
    category: "Magic Link Auth",
  });
}

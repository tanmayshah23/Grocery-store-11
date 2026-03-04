import smtplib
import sys
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(to_email, subject, body_html):
    # Credentials
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SENDER_EMAIL = "patelmeet4384@gmail.com"
    SENDER_PASSWORD = "bcbc ksqb cwzn gins"

    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body_html, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        return {"status": "OK"}
    except Exception as e:
        return {"status": "Error", "message": str(e)}

if __name__ == "__main__":
    # Read entire JSON from stdin to avoid shell escaping issues on Windows
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"status": "Error", "message": "No input received"}))
            sys.exit(1)
            
        data = json.loads(input_data)
        target_to = data.get('to')
        target_subject = data.get('subject')
        target_body = data.get('html')
        
        if not all([target_to, target_subject, target_body]):
            print(json.dumps({"status": "Error", "message": "Missing required fields in JSON"}))
            sys.exit(1)

        result = send_email(target_to, target_subject, target_body)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"status": "Error", "message": f"Python Script Error: {str(e)}"}))
        sys.exit(1)

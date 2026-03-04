// Node 18+ has native fetch, no import needed
async function testBridge() {
    const url = "https://smtpjs.com/v1/send.aspx";

    // Credentials (same as .env)
    const Host = "smtp.gmail.com";
    const Username = "patelmeet4384@gmail.com";
    const Password = "bcbc ksqb cwzn gins";
    const To = "meetpatel4384@gmail.com";
    const From = "patelmeet4384@gmail.com";
    const Subject = "Bridge Test from Node";
    const Body = "Testing the HTTP bridge logic used by the web app.";

    const data = new URLSearchParams();
    data.append("Host", Host);
    data.append("Username", Username);
    data.append("Password", Password);
    data.append("To", To);
    data.append("From", From);
    data.append("Subject", Subject);
    data.append("Body", Body);

    console.log("🚀 Testing SMTP Bridge (HTTP)...");

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: data,
        });
        const text = await response.text();
        console.log("Result from bridge:", text);

        if (text === "OK") {
            console.log("✅ SUCCESS: The bridge accepted the request.");
        } else {
            console.log("❌ FAILURE: The bridge returned:", text);
        }
    } catch (err) {
        console.error("❌ NETWORK ERROR:", err.message);
    }
}

testBridge();

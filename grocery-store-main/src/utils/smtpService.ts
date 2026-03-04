export async function sendEmail({
    To,
    Subject,
    Body
}: any): Promise<string> {
    const url = "/api/send-email";

    try {
        console.log("Routing email through local Python relay...");
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                to: To,
                subject: Subject,
                html: Body
            }),
        });

        const data = await response.json();
        console.log("Relay Response:", data);

        if (data.status === "OK") {
            return "OK";
        } else {
            return "Relay Error: " + (data.message || "Unknown Error");
        }
    } catch (err: any) {
        console.error("Relay Connection Error:", err);
        return "Failed to connect to local relay: " + (err?.message || "Check if dev server is running");
    }
}

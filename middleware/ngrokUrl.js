import ngrok from "ngrok";

let domain = null;

export async function initNgrok(req, res, next) {
    try {
        if (!domain) {
            domain = await ngrok.connect({
            addr: process.env.PORT || 8080,
            authtoken: process.env.NGROK_AUTHTOKEN,
        })
        }

        req.domain = domain;

        next();
    } catch (error) {
        console.error("Ngrok error:", error);
        res.status(500).json({ message: 'Failed to authorize' });
    }
}
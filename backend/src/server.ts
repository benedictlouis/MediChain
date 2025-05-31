import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios'; // Make sure axios is imported

// Load environment variables from .env file at the root of the 'backend' directory
dotenv.config(); 

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON request bodies

// The API endpoint for uploading to Pinata
app.post('/api/upload', async (req: Request, res: Response): Promise<void> => {
    const PINATA_JWT = process.env.REACT_APP_PINATA_JWT; // Ensure this is set in your backend's .env file

    if (!PINATA_JWT) {
        console.error("Pinata JWT not configured in environment variables.");
        res.status(500).json({ error: "Server configuration error: Pinata JWT missing." });
        return;
    }

    // Data sent from HospitalDashboard: { pinataContent: {...}, pinataMetadata: {...} }
    const { pinataContent, pinataMetadata } = req.body;

    if (!pinataContent) {
        res.status(400).json({ error: "Missing 'pinataContent' in request body." });
        return;
    }

    // Construct the body for Pinata API
    // Pinata expects an object with pinataContent, and optionally pinataMetadata and pinataOptions
    const pinataRequestBody = {
        pinataContent: pinataContent,
        ...(pinataMetadata && { pinataMetadata: pinataMetadata }) // Include metadata if provided
    };

    try {
        const pinataApiResponse = await axios.post(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            pinataRequestBody, // Send the structured body
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PINATA_JWT}`
                }
            }
        );

        // Pinata's successful response includes: { IpfsHash: "...", PinSize: ..., Timestamp: ... }
        if (pinataApiResponse.data && pinataApiResponse.data.IpfsHash) {
            console.log("Pinata API Success. IPFS Hash:", pinataApiResponse.data.IpfsHash);
            res.status(200).json({ ipfsHash: pinataApiResponse.data.IpfsHash });
        } else {
            console.error("Pinata API Error: IpfsHash not found in response", pinataApiResponse.data);
            res.status(500).json({ error: "Failed to get IPFS hash from Pinata." });
        }

    } catch (error: any) {
        console.error("Pinata API Request Error:", error.response?.data || error.message || error);
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error || "Failed to upload to IPFS due to Pinata API error.";
        res.status(statusCode).json({ error: errorMessage });
    }
});

// The call to start the server
app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
});
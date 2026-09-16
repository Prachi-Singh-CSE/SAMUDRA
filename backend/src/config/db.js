const mongoose = require("mongoose");


const connectDB = async () => {
    const mongoUri = (process.env.MONGO_URI || "").trim();

    if (!mongoUri) {
        console.warn(
            "⚠️ MONGO_URI is empty or not set. Skipping MongoDB and starting without a database."
        );
        return;
    }

    try {

        await mongoose.connect(mongoUri);

        console.log(
            "✅ MongoDB connected successfully"
        );

    } catch (error) {

        console.error(
            "❌ MongoDB connection failed:",
            error.message
        );

        process.exit(1);
    }
};


module.exports = connectDB;
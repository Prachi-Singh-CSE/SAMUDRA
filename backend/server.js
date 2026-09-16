const app = require("./src/app");

const connectDB = require("./src/config/db");

require("dotenv").config();


const PORT = process.env.PORT || 5000;


// Connect MongoDB
connectDB();


// Start server
app.listen(PORT, () => {

    console.log(
        `🚀 Marine Intelligence API running on port ${PORT}`
    );

});
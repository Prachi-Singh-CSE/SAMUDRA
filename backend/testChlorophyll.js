const {
    getChlorophyllData
} = require("./src/services/chlorophyllService");


const test = async () => {

    const data =
        await getChlorophyllData(
            19.0760,
            72.8777
        );

    console.log(data);
};


test();
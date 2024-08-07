import weaviate from "weaviate-ts-client";
import fs, { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const client = weaviate.client({
  scheme: "http",
  host: "localhost:8080",
});

const schemaRes = await client.schema.getter().do();

// console.log(schemaRes);

// Create DB schema
const createDbSchema = async () => {
  const schemaConfig = {
    class: "Clothing",
    vectorizer: "img2vec-neural",
    vectorIndexType: "hnsw",
    moduleConfig: {
      "img2vec-neural": {
        imageFields: ["image"],
      },
    },
    properties: [
      {
        name: "image",
        dataType: ["blob"],
      },
      {
        name: "text",
        dataType: ["string"],
      },
      {
        name: "productId",
        dataType: ["string"],
      },
    ],
  };

  await client.schema.classCreator().withClass(schemaConfig).do();
  console.log("---> schema created");
};

// Get the directory name of the current module
const processUploadImages = async () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const folderPath = path.join(__dirname, "img");
  const imgFiles = fs.readdirSync(folderPath);

  const promises = imgFiles.map(async (imgFile) => {
    const filePath = path.join(folderPath, imgFile);
    const imgBuffer = fs.readFileSync(filePath);
    const b64 = imgBuffer.toString("base64");
    const fileName = path.basename(filePath, path.extname(filePath));
    //   console.log(`Base64 for ${imgFile}: ${b64}`);

    try {
      await client.data
        .creator()
        .withClassName("Clothing")
        .withProperties({
          image: b64,
          text: fileName,
        })
        .do();
      console.log(`Uploaded ${fileName} successfully`);
    } catch (error) {
      console.error(`Failed to upload ${fileName}:`, error.message);
    }
  });

  await Promise.all(promises);
};

// Function to check data in Weaviate
const checkData = async () => {
  try {
    // Query the Weaviate database for all objects in the "Clothing" class
    const response = await client.data
      .getter()
      .withClassName("Clothing")
      .withLimit(100) // Adjust the limit as needed
      .do();

    // Display the data
    console.log("Data in the 'Clothing' class:");
    response.objects.forEach((item) => {
      // await client.data
      // .deleter()
      // .withClassName("Clothing")
      // .withId(item.id)
      // .do();
      console.log(`ID: ${item.id}`);
      console.log(`Text: ${item.properties.text}`);
      console.log(
        `Image Base64 (truncated): ${item.properties.image.slice(0, 100)}...`
      );
      console.log();
    });
  } catch (error) {
    console.error("Failed to retrieve data:", error.message);
  }
};

// Function to delete all data in the "Clothing" class
const deleteAllData = async () => {
  try {
    // Query the Weaviate database for all objects in the "Clothing" class
    const response = await client.data
      .getter()
      .withClassName("Clothing")
      .withLimit(1000) // Adjust the limit as needed
      .do();

    // Delete each object
    const deletePromises = response.objects.map(async (item) => {
      await client.data
        .deleter()
        .withClassName("Clothing")
        .withId(item.id)
        .do();
      console.log(`Deleted item with ID: ${item.id}`);
    });

    await Promise.all(deletePromises);
    console.log("All data deleted successfully");
  } catch (error) {
    console.error("Failed to delete data:", error.message);
  }
};

// Function to fetch data from Weaviate
const fetchData = async (limit = 100) => {
  try {
    // Query the Weaviate database for all objects in the "Clothing" class
    const response = await client.data
      .getter()
      .withClassName("Clothing")
      .withLimit(limit) // Adjust the limit as needed
      .do();

    // Return the fetched data
    return response.objects.map((item) => ({
      id: item.id,
      text: item.properties.text,
      image: item.properties.image,
    }));
  } catch (error) {
    console.error("Failed to fetch data:", error.message);
    return [];
  }
};

const searchSimilarImage = async () => {
  const test = Buffer.from(readFileSync("./test.jpeg")).toString("base64");

  const resImage = await client.graphql
    .get()
    .withClassName("Clothing")
    .withFields(["text", "_additional { certainty }"])
    .withNearImage({ image: test })
    .withLimit(5)
    .do();

  console.log(resImage);
  console.log(resImage.data.Get.Clothing);
};

// Function to delete the "Clothing" class schema
const deleteSchemaClass = async () => {
  try {
    await client.schema.classDeleter().withClassName("Meme").do();
    console.log("Deleted 'Clothing' class schema successfully");
  } catch (error) {
    console.error("Failed to delete 'Clothing' class schema:", error.message);
  }
};

// await createDbSchema();
// processUploadImages();
// checkData();
// await deleteAllData();
// await fetchData(50);
await searchSimilarImage();
// await deleteSchemaClass();

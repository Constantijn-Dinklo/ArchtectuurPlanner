import dotenv from "dotenv";
dotenv.config(); //First thing that needs to be called before any import

import app from "./app";


const PORT = process.env.PORT || 3000;


// ✅ Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
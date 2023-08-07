import mongoose from "mongoose";
import IUser from "../interfaces/IUser";

const userSchema = new mongoose.Schema<IUser>({
  chatId: {
    type: Number,
    required: true,
    unique: true,
  },
});

export default mongoose.model("User", userSchema);

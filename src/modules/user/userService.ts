import UserModel from "../../models/userModel.ts";
import IUser from "../../interfaces/IUser.ts";

class UserService {
  create(user: IUser) {
    return UserModel.create(user);
  }

  findById(id: string) {
    return UserModel.findById(id);
  }

  findByChatId(chatId: number) {
    return UserModel.findOne({ chatId });
  }
}

export default UserService;

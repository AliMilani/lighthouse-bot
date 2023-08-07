import UserModel from "../../models/userModel";
import IUser from "../../interfaces/IUser";

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

import { User } from "@prisma/client";
import JWT from "jsonwebtoken";
import { JWTUser } from "../interfaces";

const JWT_SECRET_KEY = process.env.JWT_SECRET as string; 

class JWTService {
  public static generateTokenForUser(user: User) {
    const payload: JWTUser = {
      id: user?.id,
      email: user?.email,
    };

    const token = JWT.sign(payload, JWT_SECRET_KEY);
    return token;
  }

  public static decodeToken(token: string) {
    try {
      return JWT.verify(token, JWT_SECRET_KEY) as JWTUser
    } catch (error) {
      return null;
    }
    
  }
}
export default JWTService;

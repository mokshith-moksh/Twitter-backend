"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.types = void 0;
exports.types = `#graphql
type Tweet{
  id: ID! 
  content: String
  imageUrl: String
  auther: User
} 
`;

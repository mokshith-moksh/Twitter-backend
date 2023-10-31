export const types = `#graphql
type Tweet{
  id: ID! 
  content: String
  imageUrl: String
  
  auther: User
  likes: [User]
} 
`;

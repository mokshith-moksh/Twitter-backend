export const queries = `#graphql
verifyGoogleToken(token:String!):String
getCurrentUser:User
getUserById(id:ID!):User
getAllUser:[User]
getSearchUser(searchQuery:String!): [User]
`
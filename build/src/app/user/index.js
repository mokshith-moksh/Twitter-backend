"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const types_1 = require("./types"); //type of data
const queries_1 = require("./queries"); //type of queries
const resolver_1 = require("./resolver"); //type of query resolver
const mutations_1 = require("./mutations");
exports.User = { types: types_1.types, queries: queries_1.queries, resolvers: resolver_1.resolvers, mutations: mutations_1.mutations };

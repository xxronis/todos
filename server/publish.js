// Lists -- {name: String,
//           store_id: String
//           timestamp: Number
//           }
Lists = new Meteor.Collection("lists");
// Stores -- {name: String,
//           faved: Number,
//           tags: [String, ...],
//           }
// Stores = new Meteor.Collection("stores");
// // Publish store for requested list_id.
// Meteor.publish('stores', function () {
//   return Stores.find();
// });
// Publish complete set of lists to all clients.
Meteor.publish('lists', function () {
  return Lists.find();
});


// Todos -- {text: String,
//           done: Boolean,
//           tags: [String, ...],
//           list_id: String,
//           timestamp: Number}
Todos = new Meteor.Collection("todos");

// Publish all items for requested list_id.
Meteor.publish('todos', function (list_id) {
  return Todos.find({list_id: list_id});
});
// Publish todo-counters for every project using publish-counter.
Meteor.publish('counters', function(list_id) {
  publishCount(this, 'todos-count-list-' + list_id, Todos.find({list_id:list_id}, { fields: { _id: true }}));
});
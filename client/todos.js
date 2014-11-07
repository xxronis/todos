// Client-side JavaScript, bundled and sent to client.

// Define Minimongo collections to match server/publish.js.
Lists = new Meteor.Collection("lists");
Todos = new Meteor.Collection("todos");
// Stores = new Meteor.Collection("stores");

// ID of currently selected list
Session.setDefault('list_id', null);

// Name of currently selected tag for filtering
Session.setDefault('tag_filter', null);

// When adding tag to a todo, ID of the todo
Session.setDefault('editing_addtag', null);

// When editing a list name, ID of the list
Session.setDefault('editing_listname', null);

// When editing todo text, ID of the todo
Session.setDefault('editing_itemname', null);

// Subscribe to 'lists' collection on startup.
// Select a list once data has arrived.
var listsHandle = Meteor.subscribe('lists', function () {
  if (!Session.get('list_id')) {
    // var list = Lists.findOne({}, {sort: {name: 1}});
    // if (list)
    //   Router.setList(list._id);
  }
});

var todosHandle = null;
// Always be subscribed to the todos for the selected list.
Deps.autorun(function () {
  var list_id = Session.get('list_id');
  if (list_id)
    todosHandle = Meteor.subscribe('todos', list_id);
  else
    todosHandle = null;

  // Subscribe to each Projects todo-counter.
  Lists.find({}).forEach(function(list) {
    Meteor.subscribe('counters', list._id);
  })
});


////////// Helpers for in-place editing //////////

// Returns an event map that handles the "escape" and "return" keys and
// "blur" events on a text input (given by selector) and interprets them
// as "ok" or "cancel".
var okCancelEvents = function (selector, callbacks) {
  var ok = callbacks.ok || function () {};
  var cancel = callbacks.cancel || function () {};

  var events = {};
  events['keyup '+selector+', keydown '+selector+', focusout '+selector] =
    function (evt) {
      if (evt.type === "keydown" && evt.which === 27) {
        // escape = cancel
        cancel.call(this, evt);

      } else if (evt.type === "keyup" && evt.which === 13 ||
                 evt.type === "focusout") {
        // blur/return/enter = ok/submit if non-empty
        var value = String(evt.target.value || "");
        if (value)
          ok.call(this, value, evt);
        else
          cancel.call(this, evt);
      }
    };

  return events;
};

var activateInput = function (input) {
  input.focus();
  input.select();
};

////////// Lists //////////
Template.lists.helpers({
  lists: function () {
    list_infos = [];
    Lists.find({}).forEach(function(list) {
      list_infos.push({_id: list._id, name:list.name, count: Counts.get('todos-count-list-' + list._id), active: Counts.get('todos-count-active-' + list._id)})
    })
    return list_infos;
  },
  loading: function () {
    return !listsHandle.ready();
  },
  selected: function () {
  return Session.equals('list_id', this._id) ? 'active' : '';
  },
  name_class: function () {
    return this.name ? '' : 'empty';
  },
  tems_count: function () {
    return Todos.find({list_id:this._id}).count();
  },
  editing: function () {
    return Session.equals('editing_listname', this._id);
  }
})

Template.lists.events({
  'mousedown .list': function (evt) { // select list
    Router.setList(this._id);
    // Session.set('listname', this._name);
  },
  'click .list': function (evt) {
    // prevent clicks on <a> from refreshing the page.
    evt.preventDefault();
  },
  'dblclick .list': function (evt, tmpl) { // start editing list name
    Session.set('editing_listname', this._id);
    Deps.flush(); // force DOM redraw, so we can focus the edit field
    activateInput(tmpl.find("#list-name-input"));
  },
  'click .list-destroy': function (evt) {
    Lists.remove(this._id);
  },
});

// Attach events to keydown, keyup, and blur on "New list" input box.
Template.lists.events(okCancelEvents(
  '#new-list',
  {
    ok: function (text, evt) {
      var id = Lists.insert({name: text});
      Router.setList(id);
      evt.target.value = "";
    }
  }));

Template.lists.events(okCancelEvents(
  '#list-name-input',
  {
    ok: function (value) {
      Lists.update(this._id, {$set: {name: value}});
      Session.set('editing_listname', null);
    },
    cancel: function () {
      Session.set('editing_listname', null);
    }
  }));

////////// Todos //////////

Template.todos.helpers({
  todos: function () {
    // Determine which todos to display in main pane,
    // selected based on list_id and tag_filter.
    var list_id = Session.get('list_id');
    if (!list_id)
      return {};

    var sel = {list_id: list_id};
    var tag_filter = Session.get('tag_filter');
    if (tag_filter)
      sel.tags = tag_filter;

    return Todos.find(sel, {sort: {done: true, timestamp: -1}});
  },
  loading: function () {
    return todosHandle && !todosHandle.ready();
  },
  any_list_selected: function () {
    return !Session.equals('list_id', null);
  }
})

Template.todos.events(okCancelEvents(
  '#new-todo',
  {
    ok: function (text, evt) {
      var tag = Session.get('tag_filter');
      Todos.insert({
        text: text,
        list_id: Session.get('list_id'),
        done: false,
        timestamp: (new Date()).getTime(),
        tags: tag ? [tag] : []
      });
      evt.target.value = '';
    }
  })
);
Template.todo_item.helpers({
  tag_objs: function () {
    var todo_id = this._id;
    return _.map(this.tags || [], function (tag) {
      return {todo_id: todo_id, tag: tag};
    });
  },
  done_class: function () {
    return this.done ? 'done' : '';
  },
  done_checkbox: function () {
    return this.done ? 'checked' : '';
  },
  editing: function () {
    return Session.equals('editing_itemname', this._id);
  },
  adding_tag: function () {
    return Session.equals('editing_addtag', this._id);
  },
  todo_collapse_id: function () {
    return this._id;
  },
});


Template.todo_item.events({
  'click .check': function () {
    Todos.update(this._id, {$set: {done: !this.done}});
  },
  'click .name': function () {
    Session.set('tag_filter', this.tag);
  },
  'click .destroy': function () {
    Todos.remove(this._id);
  },

  'click .addtag': function (evt, tmpl) {
    Session.set('editing_addtag', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#edittag-input"));
  },

  'dblclick .display .todo-text': function (evt, tmpl) {
    Session.set('editing_itemname', this._id);
    Deps.flush(); // update DOM before focus
    activateInput(tmpl.find("#todo-input"));
  },

  'click .remove': function (evt) {
    var tag = this.tag;
    var id = this.todo_id;

    evt.target.parentNode.style.opacity = 0;
    // wait for CSS animation to finish
    Meteor.setTimeout(function () {
      Todos.update({_id: id}, {$pull: {tags: tag}});
    }, 300);
  }
});

Template.todo_item.events(okCancelEvents(
  '#todo-input',
  {
    ok: function (value) {
      Todos.update(this._id, {$set: {text: value}});
      Session.set('editing_itemname', null);
    },
    cancel: function () {
      Session.set('editing_itemname', null);
    }
  }));

Template.todo_item.events(okCancelEvents(
  '#edittag-input',
  {
    ok: function (value) {
      Todos.update(this._id, {$addToSet: {tags: value}});
      Session.set('editing_addtag', null);
    },
    cancel: function () {
      Session.set('editing_addtag', null);
    }
  }));

////////// Tag Filter //////////

// Pick out the unique tags from all todos in current list.
Template.tag_filter.helpers({
  tags: function () {
    var tag_infos = [];
    var total_count = 0;

    Todos.find({list_id: Session.get('list_id')}).forEach(function (todo) {
      _.each(todo.tags, function (tag) {
        var tag_info = _.find(tag_infos, function (x) { return x.tag === tag; });
        if (! tag_info)
          tag_infos.push({tag: tag, count: 1});
        else
          tag_info.count++;
      });
      total_count++;
    });

    tag_infos = _.sortBy(tag_infos, function (x) { return x.tag; });
    tag_infos.unshift({tag: null, count: total_count});

    return tag_infos;
  },
  tag_text: function () {
    return this.tag || "All items";
  },
  selected: function () {
    return Session.equals('tag_filter', this.tag) ? 'active' : '';
  }
})


Template.Home.helpers({
  text: function () {
    return "Fuch yeah";
  }  
})


Template.tag_filter.events({
  'mousedown .tag': function () {
    if (Session.equals('tag_filter', this.tag))
      Session.set('tag_filter', null);
    else
      Session.set('tag_filter', this.tag);
  },
  'click .tag': function (evt) {
    // prevent clicks on <a> from refreshing the page.
    evt.preventDefault();
  },
});

////////// Tracking selected list in URL //////////

var TodosRouter = Backbone.Router.extend({
  routes: {
    ":list_id": "main"
  },
  main: function (list_id) {
    var oldList = Session.get("list_id");
    if (oldList !== list_id) {
      Session.set("list_id", list_id);
      Session.set("tag_filter", null);
    }
  },
  setList: function (list_id) {
    this.navigate(list_id, true);
  }
});

Router = new TodosRouter;

Meteor.startup(function () {
  Backbone.history.start({pushState: true});
});
Router.route('/', function () {
  this.render('Home', {
    data: function () { return Items.findOne({_id: this.params._id}) }
  });
});

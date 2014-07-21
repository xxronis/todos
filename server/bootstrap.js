// if the database is empty on server start, create some sample data.
Meteor.startup(function () {
  if (Lists.find().count() === 0) {
    var todos = [
      {
        text: "fix multiple tag display and add more css",
        tags: ["bugs"]
      },
      {
        text: "user-accounts and access rules",
        tags: ["user-accounts"]
      },
      {
        text: "User Teams",
        tags: ["user-accounts"]
      },
      {
        text: "working repository live integration?! (for a git project)"
      },
      {
        text: "more bootstrap and font-awesomeness",
        tags: [
          "front-end"
        ]
      },
      {
        text: "Live Graphs",
      },
      {
        text: "Date info on items", tags: []
      },
      {
        text: "Deploy one codebase to web/android/ios app with Phonegap/cordova!", tags: [
          "mobile"
        ]
      }
    ];
    var lists = [
      {
        name: "LiveTodo"
      }
    ];

    var timestamp = (new Date()).getTime();
    for (var i = 0; i < lists.length; i++) {
      var list_id = Lists.insert({name: lists[i].name});
      for (var j = 0; j < todos.length; j++) {
        var info = todos[j];
        Todos.insert({list_id: list_id,
                      text: info.text,
                      timestamp: timestamp,
                      tags: info.tags
                    });
        timestamp += 1; // ensure unique timestamp.
      }
    }
  }
});

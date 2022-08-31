---
---

$(function() {
  deadlineByConf = {};

  {% for conf in site.data.conferences %}

  {% assign conf_id = conf.name | append: conf.year | slugify %}

  {% if conf.deadline == "TBA" %}
  $('#{{ conf_id }} .timer').html("TBA");
  $('#{{ conf_id }} .deadline-time').html("TBA");
  deadlineByConf["{{ conf_id }}"] = null;

  {% else %}
  var rawDeadlines = {{ conf.deadline | jsonify }} || [];
  if (rawDeadlines.constructor !== Array) {
    rawDeadlines = [rawDeadlines];
  }
  var parsedDeadlines = [];
  while (rawDeadlines.length > 0) {
    var rawDeadline = rawDeadlines.pop();
    // check if date is template
    if (rawDeadline.indexOf('%y') >= 0) {
      year = parseInt(moment().year());
      rawDeadlines.push(rawDeadline.replace('%y', year));
      rawDeadlines.push(rawDeadline.replace('%y', year + 1));

    } else {
      // adjust date according to deadline timezone
      {% if conf.timezone %}
      var deadline = moment.tz(rawDeadline, "{{ conf.timezone }}");
      {% else %}
      var deadline = moment.tz(rawDeadline, "Etc/GMT+12"); // Anywhere on Earth
      {% endif %}

      // post-process date
      if (deadline.minutes() === 0) {
        deadline.subtract(1, 'seconds');
      }
      if (deadline.minutes() === 59) {
        deadline.seconds(59);
      }
      parsedDeadlines.push(deadline);
    }
  }

  // check which deadline is closest
  var confDeadline = parsedDeadlines[0];
  var today = moment();
  for (var i = 1; i < parsedDeadlines.length; i++) {
    deadlineCandidate = parsedDeadlines[i];
    if ((today.diff(deadlineCandidate) < 0 && today.diff(deadlineCandidate) > today.diff(confDeadline))) {
      confDeadline = deadlineCandidate;
    }
  }

  // render countdown timer
  if (confDeadline) {
    function make_update_countdown_fn(confDeadline) {
      return function(event) {
        diff = moment() - confDeadline
        if (diff <= 0) {
           $(this).html(event.strftime('%D days %Hh %Mm %Ss'));
        } else {
          $(this).html(confDeadline.fromNow());
        }
      }
    }
    $('#{{ conf_id }} .timer').countdown(confDeadline.toDate(), make_update_countdown_fn(confDeadline));
    // check if date has passed, add 'past' class to it
    if (moment() - confDeadline > 0) {
      $('#{{ conf_id }}').addClass('past');
    }
    $('#{{ conf_id }} .deadline-time').html(confDeadline.local().format('D MMM YYYY, h:mm:ss a'));
    deadlineByConf["{{ conf_id }}"] = confDeadline;
  }
  {% endif %}
  {% endfor %}

  // Reorder list
  confs = $('.conf');
  confs.detach().sort(function(a, b) {
    // Target sorting:
    // dates after today in ascending order
    // null values
    // dates before today in descending order

    const aDate = deadlineByConf[a.id];
    const bDate = deadlineByConf[b.id];

    if (aDate === bDate || aDate?.isSame(bDate)) {
      return 0;
    }

    const today = moment();

    // Sort null values to the middle
    if (aDate == null) {
      if (today.isBefore(bDate)) {
        return +1;
      }

      return -1;
    }
    if (bDate == null) {
      if (today.isBefore(aDate)) {
        return -1;
      }

      return +1;
    }

    // Effectively calculates (today - other)
    const tDiffA = today.diff(aDate);
    const tDiffB = today.diff(bDate);

    // Sort remaining values ascending if upcoming, descending otherwise
    //   Both after today (upcoming): ascending
    if (tDiffA <= 0 && tDiffB <= 0) {
      return aDate.diff(bDate);
    }
    //   Both before today (past): descending
    if (tDiffA > 0 && tDiffB > 0) {
      return bDate.diff(aDate);
    }

    // Remaining cases: (a < today < b)  and  (b < today < a)
    // Here, we sort descending to move upcoming dates to the front.
    return bDate.diff(aDate);
  });
  $('.conf-container').append(confs);

  // Set checkboxes
  var conf_type_data = {{ site.data.types | jsonify }};
  var all_tags = [];
  var toggle_status = {};
  for (var i = 0; i < conf_type_data.length; i++) {
    all_tags[i] = conf_type_data[i]['tag'];
    toggle_status[all_tags[i]] = false;
  }
  var tags = store.get('{{ site.domain }}');
  if (tags === undefined) {
    tags = all_tags;
  }
  for (var i = 0; i < tags.length; i++) {
    $('#' + tags[i] + '-checkbox').prop('checked', true);
    toggle_status[tags[i]] = true;
  }
  store.set('{{ site.domain }}', tags);

  function update_conf_list() {
    confs.each(function(i, conf) {
      var conf = $(conf);
      var show = false;
      for (var i = 0; i < all_tags.length; i++) {
        if(conf.hasClass(all_tags[i])) {
          show = show | toggle_status[all_tags[i]];
        }
      }
      if (show) {
        conf.show();
      } else {
        conf.hide()
      }
    });
  }
  update_conf_list();

  // Event handler on checkbox change
  $('form :checkbox').change(function(e) {
    var checked = $(this).is(':checked');
    var tag = $(this).prop('id').slice(0, -9);
    toggle_status[tag] = checked;

    if (checked == true) {
      if (tags.indexOf(tag) < 0)
        tags.push(tag);
    }
    else {
      var idx = tags.indexOf(tag);
      if (idx >= 0)
        tags.splice(idx, 1);
    }
    store.set('{{ site.domain }}', tags);
    update_conf_list();
  });
});

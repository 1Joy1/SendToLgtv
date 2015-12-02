function updateServersTable(data, textbtnDEL, textbtnEDIT) {
    var servers = data.servers;
    var YTresolution = data.YTresolution;
    if (YTresolution == '1080p') {
        inlineRadio3.checked = true;
    }
    if (YTresolution == '720p') {
        inlineRadio2.checked = true;
    }
    if (YTresolution == '360p') {
        inlineRadio1.checked = true;
    }
    $('#serverlist').empty();
    if (servers.length === 0) {
        $('#noservers').removeClass('hidden');
    }
    servers.forEach(function(server) {
        var link = document.createElement('a');
        link.href = '#addserver';
        link.className = 'btn btn-default editbtn btn-sm';
        link.appendChild(document.createTextNode(textbtnEDIT));
        var deletebtn = document.createElement('button');
        deletebtn.className = 'btn btn-danger btn-sm deleterow';
        deletebtn.type = 'button';
        deletebtn.appendChild(document.createTextNode(textbtnDEL));
        var row = document.createElement('tr');
        for (var property in server) {
            var td = document.createElement('td');
            var cellText = document.createTextNode(server[property]);
            td.appendChild(cellText);
            row.appendChild(td);
        }
        var td = document.createElement('td');
        td.appendChild(link);
        td.appendChild(document.createTextNode(' '));
        td.appendChild(deletebtn);
        row.appendChild(td);
        var serverlist = document.getElementById('serverlist');
        serverlist.appendChild(row);
    });
}

function updatePage() {
    var servers = [];
    $('#serverlist tr').each(function() {
        var server = {};
        var ritems = $('td', this);
        server.label = $(ritems[0]).text();
        server.host = $(ritems[1]).text();
        server.platform = $(ritems[2]).text();
        server.key = $(ritems[3]).text();
        servers.push(server);
    });
    var YoutubeResolutios = $('input[name=inlineRadioOptions]:checked',
        '#optionsYoutubeResolution').val();
    self.port.emit('updateservers', servers, YoutubeResolutios);
    if ($('#serverlist tr').size() === 0) {
        $('#noservers').removeClass('hidden');
    } else {
        $('#noservers').addClass('hidden');
    }
}

function validateForm() {
    if ($('#server-label').val() === '') {
        $('#server-label').parent().addClass('has-error');
        return false;
    }
    var ipregex =
        /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
    var keyregex = /^[0-9]{6}$/;
    if ($('#server-ip').val() === '' || (!ipregex.test($('#server-ip').val()))) {
        $('#server-ip').parent().addClass('has-error');
        return false;
    }
    if ($('#server-key').val() === '' || (!keyregex.test($('#server-key').val()))) {
        $('#server-key').parent().addClass('has-error');
        return false;
    }
    return true;
}

function validateFormForGetKey() {
    var ipregex =
        /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
    if ($('#server-ip').val() === '' || (!ipregex.test($('#server-ip').val()))) {
        $('#server-ip').parent().addClass('has-error');
        $('#get-key').prop("disabled", true);
        $('#check-connect').prop("disabled", true);
        return false;
    }
    $('#get-key').prop("disabled", false);
    $('#check-connect').prop("disabled", false);
    return true;
}

function validateFormForSendKey() {
    var keyregex = /^[0-9]{6}$/;
    if ($('#server-key').val() === '' || (!keyregex.test($('#server-key').val()))) {
        $('#server-key').parent().addClass('has-error');
        $('#check-connect').prop("disabled", true);
        //$('#get-key').prop("disabled",true);
        return false;
    }
    $('#check-connect').prop("disabled", false);
    $('#get-key').prop("disabled", false);
    return true;
}

self.port.on("init", function(data) {
    var textbtnDEL = data.textbtnDEL;
    var textbtnEDIT = data.textbtnEDIT;
    updateServersTable(data, textbtnDEL, textbtnEDIT);
    $('#get-key').prop("disabled", true);
    $('#check-connect').prop("disabled", true);
    $('.radio-inline').on('change', function() {
        updatePage();
    });

    if ($('#server-ip').val() !== '' && $('#server-key').val() !== '' || $(
        '#server-ip').val() !== '' && $('#server-key').val() == '') {
        if (!validateFormForGetKey() || !validateFormForSendKey()) {
            $('#formmode').removeClass('connectmode').addClass('keymode');
        } else {
            $('#formmode').removeClass('keymode').addClass('connectmode');
            $('.form-group.has-error').removeClass('has-error');
        }
    }


    $('#server-ip').on('input', function() {
        if (!validateFormForGetKey()) {
            return false;
        } else {
            $('.form-group.has-error').removeClass('has-error');
        }
    });

    $('#server-key').on('input', function() {
        if (!validateFormForSendKey() || !validateFormForGetKey()) {
            $('#formmode').removeClass('connectmode').addClass(
                'keymode');
            return false;
        } else {
            $('#formmode').removeClass('keymode').addClass(
                'connectmode');
            $('.form-group.has-error').removeClass('has-error');
        }
    });

    $('#serverlist').on('click', '.deleterow', function(e) {
        e.preventDefault();
        $(this).parent().parent().remove();
        updatePage();
        //$('#mywarning').delay(100).animate({opacity: 1}, 500 ).delay(15000).animate({opacity: 0}, 500 );
    });

    $('#serverlist').on('click', '.editbtn', function(e) {
        e.preventDefault();
        window.editingEl = $(this).parent().parent();
        window.editingEl.find('td').each(function(i) {
            var el = $(this);
            if (i === 0) {
                $('#server-label').val(el.text());
            }
            if (i === 1) {
                $('#server-ip').val(el.text());
            }
            if (i === 2) {
                $('#select-platform').val(el.text());
            }
            if (i === 3) {
                $('#server-key').val(el.text());
            }
        });
        $('#formmode').removeClass('addmode').addClass('editmode');
        if (!validateFormForSendKey() || !validateFormForGetKey()) {
            $('#formmode').removeClass('connectmode').addClass(
                'keymode');
        } else {
            $('#formmode').removeClass('keymode').addClass(
                'connectmode');
            $('.form-group.has-error').removeClass('has-error');
        }
    });

    $('#server-edit').on('click', function(e) {
        e.preventDefault();
        if (!validateForm()) {
            return false;
        } else {
            $('.form-group.has-error').removeClass('has-error');
            $('#formmode').removeClass('connectmode').addClass(
                'keymode');
            $('#get-key').prop("disabled", true);
            $('#check-connect').prop("disabled", true);
        }

        //Construct new row
        var link = document.createElement('a');
        link.href = '#addserver';
        link.className = 'btn btn-default editbtn btn-sm';
        link.appendChild(document.createTextNode(textbtnEDIT));
        var deletebtn = document.createElement('button');
        deletebtn.className = 'btn btn-danger btn-sm deleterow';
        deletebtn.type = 'button';
        deletebtn.appendChild(document.createTextNode(textbtnDEL));
        var row = document.createElement('tr');
        var td = document.createElement('td');
        var cellText = document.createTextNode(document.getElementById(
            'server-label').value);
        td.appendChild(cellText);
        row.appendChild(td);
        td = document.createElement('td');
        cellText = document.createTextNode(document.getElementById(
            'server-ip').value);
        td.appendChild(cellText);
        row.appendChild(td);
        td = document.createElement('td');
        cellText = document.createTextNode(document.getElementById(
            'select-platform').value);
        td.appendChild(cellText);
        row.appendChild(td);
        td = document.createElement('td');
        cellText = document.createTextNode(document.getElementById(
            'server-key').value);
        td.appendChild(cellText);
        row.appendChild(td);
        td = document.createElement('td');
        td.appendChild(link);
        td.appendChild(document.createTextNode(' '));
        td.appendChild(deletebtn);
        row.appendChild(td);

        //Replace the row being edited with the new row
        window.editingEl.replaceWith(row);
        $('#addserver')[0].reset();
        $('#formmode').removeClass('editmode').addClass('addmode');
        updatePage();
        //$('#mywarning').delay(100).animate({opacity: 1}, 500 ).delay(15000).animate({opacity: 0}, 500 );
        return false;
    });

    $('#server-add').on('click', function(e) {
        e.preventDefault();
        if (!validateForm()) {
            return false;
        } else {
            $('.form-group.has-error').removeClass('has-error');
            $('#formmode').removeClass('connectmode').addClass(
                'keymode');
            $('#get-key').prop("disabled", true);
            $('#check-connect').prop("disabled", true);
        }
        //Construct row
        var link = document.createElement('a');
        link.href = '#addserver';
        link.className = 'btn btn-default editbtn btn-sm';
        link.appendChild(document.createTextNode(textbtnEDIT));
        var deletebtn = document.createElement('button');
        deletebtn.className = 'btn btn-danger btn-sm deleterow';
        deletebtn.type = 'button';
        deletebtn.appendChild(document.createTextNode(textbtnDEL));
        var row = document.createElement('tr');
        var td = document.createElement('td');
        var cellText = document.createTextNode(document.getElementById(
            'server-label').value);
        td.appendChild(cellText);
        row.appendChild(td);
        td = document.createElement('td');
        cellText = document.createTextNode(document.getElementById(
            'server-ip').value);
        td.appendChild(cellText);
        row.appendChild(td);
        td = document.createElement('td');
        cellText = document.createTextNode(document.getElementById(
            'select-platform').value);
        td.appendChild(cellText);
        row.appendChild(td);
        td = document.createElement('td');
        cellText = document.createTextNode(document.getElementById(
            'server-key').value);
        td.appendChild(cellText);
        row.appendChild(td);
        td = document.createElement('td');
        td.appendChild(link);
        td.appendChild(document.createTextNode(' '));
        td.appendChild(deletebtn);
        row.appendChild(td);

        //Add this row to the list of servers
        var serverlist = document.getElementById('serverlist');
        serverlist.appendChild(row);
        //$('#serverlist').append(row);
        $('#addserver')[0].reset();
        updatePage();
        //$('#mywarning').delay(100).animate({opacity: 1}, 500 ).delay(15000).animate({opacity: 0}, 500 );
        return false;
    });
    /////////////////
    $('#get-key').on('click', function(e) {
        e.preventDefault();
        document.getElementById("keyanswer").style.visibility =
            "visible";
        document.getElementById("keyanswer").style.color = "#333333";
        self.port.emit('getkey', {
            Label: document.getElementById('server-label').value,
            IP: document.getElementById('server-ip').value,
            Platform: document.getElementById('select-platform').value,
            Key: document.getElementById('server-key').value,
            Command: "ShowKey"
        });
        $('#get-key').prop("disabled", true);
        $('#check-connect').prop("disabled", true);
    });

    $('#check-connect').on('click', function(e) {
        e.preventDefault();
        document.getElementById("keyanswer").style.visibility =
            "visible";
        document.getElementById("keyanswer").style.color = "#333333";
        self.port.emit('getkey', {
            Label: document.getElementById('server-label').value,
            IP: document.getElementById('server-ip').value,
            Platform: document.getElementById('select-platform').value,
            Key: document.getElementById('server-key').value,
            Command: "Hello"
        });
        $('#get-key').prop("disabled", true);
        $('#check-connect').prop("disabled", true);
    });

    self.port.on("keymessage", function(data) {
        document.getElementById("keyanswer").style.visibility =
            "hidden";
        $('#get-key').prop("disabled", false);
        $('#check-connect').prop("disabled", false);
    });
    //////////////////////
    window.pagestate = 'saved';
});
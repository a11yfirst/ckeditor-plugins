CKEDITOR.plugins.add('a11yfirst-headings', {
    init: function (editor) {
        if (editor.blockless)
            return;

        var config = editor.config,
            lang = editor.lang.format;

        var label = 'Headings';
        var title = 'Identify Headings on the Page';

        var helpLabel = "help";
        
        CKEDITOR.dialog.add(helpLabel, this.path + 'dialogs/a11yfirst_headings_help.js');

        editor.addCommand(helpLabel, new CKEDITOR.dialogCommand( helpLabel ));


        // Gets the list of tags from the settings.
        var tags = config.format_tags.split(';');

        tags = 'h2;h3;h4;h5;h6;p'.split(';');

        //console.log('FORMAT TAGS: ' + tags);

        // Create style objects for all defined styles.
        var styles = {},
            stylesCount = 0,
            allowedContent = [];
        for (var i = 0; i < tags.length; i++) {
            var tag = tags[i];

            //console.log('TAG: ' + tag)

            var style = new CKEDITOR.style(config['format_' + tag]);

            //console.log('STYLE: ' + style)

            if (!editor.filter.customConfig || editor.filter.check(style)) {
                stylesCount++;
                styles[tag] = style;
                styles[tag]._.enterMode = editor.config.enterMode;
                allowedContent.push(style);
            }
        }

        // Hide entire combo when all formats are rejected.
        if (stylesCount === 0)
            return;

        editor.ui.addRichCombo('a11yFormat', {
            label: label,
            title: title,
            toolbar: 'a11yFirst',
            allowedContent: allowedContent,

            panel: {
                css: [editor.config.contentsCss, CKEDITOR.skin.getPath('editor')],
                multiSelect: false,
                attributes: {
                    'aria-label': 'Format blocks of text'
                },
            },

            getAllowedElements: function () {

                function getLastHeading(e) {

                    if (typeof e.getName !== 'function') return false;

                    //console.log('ELEMENT: ' + e.getName() + ' ' + selectedElement.getName() + ' ' + e.equals(selectedElement));

                    if (e.equals(selectedElement)) return true;

                    var n = e.getName();

                    if (n === 'body') lastHeading = 'h2;p;a;';
                    if (n === 'h2') lastHeading = 'h2;h3;p;';
                    if (n === 'h3') lastHeading = 'h3;h4;p;';
                    if (n === 'h4') lastHeading = 'h3;h4;h5;p;';
                    if (n === 'h5') lastHeading = 'h3;h4;h5;h6;p';
                    if (n === 'h6') lastHeading = 'h3;h4;h5;h6;p';

                    var children = e.getChildren();
                    var count = children.count();

                    for (var i = 0; i < count; i++) {
                        if (getLastHeading(children.getItem(i))) return true;
                    }

                    return false;
                }

                var elements = 'h2;';

                var lastHeading = '';

                var selection = editor.getSelection();
                //console.log('SELECTION: ' + selection );

                var selectedElement = selection.getStartElement();
                //console.log('SELECTED ELEMENT: ' + selectedElement.getName() );

                var element = editor.document.getBody();

                getLastHeading(element);
                //console.log('LAST HEADING: ' + lastHeading );

                elements += lastHeading + 'hx;';

                return elements;
            },

            init: function () {
                this.startGroup(title);

                for (var tag in styles) {
                    var label = lang['tag_' + tag];

                    // Add the tag entry to the panel list.
                    if(tag == 'p')
                        this.add(tag, "reset", label);
                    else
                        this.add(tag, styles[tag].buildPreview(label), label);
                }

                this.add(helpLabel, styles["p"].buildPreview(helpLabel), helpLabel);
            },

            onClick: function (value) {
                //console.log('VALUE: ' + value)
                if (value == helpLabel) {
                    //window.open("https://github.com/a11yfirst/texteditortesting/wiki/Plugin-Instruction#headings");
                    editor.execCommand(helpLabel);
                } else {

                    editor.focus();
                    editor.fire('saveSnapshot');

                    var style = styles[value],
                        elementPath = editor.elementPath();

                    //console.log('STYLE: ' + style)

                    editor[style.checkActive(elementPath, editor) ? 'removeStyle' : 'applyStyle'](style);

                    // Save the undo snapshot after all changes are affected. (#4899)
                    setTimeout(function () {
                        editor.fire('saveSnapshot');
                    }, 0);
                }
            },
            onRender: function () {
                editor.on('selectionChange', function (ev) {
                    var currentTag = this.getValue(),
                        elementPath = ev.data.path;
                    this.refresh();

                    for (var tag in styles) {
                        if (styles[tag].checkActive(elementPath, editor)) {
                            if (tag != currentTag)
                                this.setValue(tag, label);
                            return;
                        }
                    }

                    // If no styles match, just empty it.
                    this.setValue('');

                }, this);
            },

            onOpen: function () {

                this.showAll();
                var allowedElements = this.getAllowedElements();

                for (var name in styles) {
                    var style = styles[name];
                    // Check if that style is enabled in activeFilter.
                    if (!editor.activeFilter.check(style) || (allowedElements.indexOf(name) < 0))
                        this.hideItem(name);

                }
            },

            refresh: function () {
                var elementPath = editor.elementPath();

                if (!elementPath)
                    return;

                // Check if element path contains 'p' element.
                if (!elementPath.isContextFor('p')) {
                    this.setState(CKEDITOR.TRISTATE_DISABLED);
                    return;
                }

                // Check if there is any available style.
                for (var name in styles) {
                    if (editor.activeFilter.check(styles[name]))
                        return;
                }
                this.setState(CKEDITOR.TRISTATE_DISABLED);
            }
        });
    }
});

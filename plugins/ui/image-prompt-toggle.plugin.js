/*
    Show Image Prompt Toggle
    by Patrice

    Adds a system setting and a quick toggle to show each individual image's prompt. Useful with randomized prompts.
*/
(function() {
    "use strict"

    var styleSheet = document.createElement("style");
    styleSheet.textContent = `
        .tertiaryButton:hover {
            background: var(--tertiary-background-color);
            color: var(--tertiary-color);
        }
        
        .tertiaryButton.pressed {
            border-style: inset;
            background: hsl(var(--accent-hue), 100%, calc(var(--accent-lightness) + 6%));
            color: var(--accent-text-color);
        }
        
        .tertiaryButton:not(#random_seed_btn):not(#process_order_btn):not(#auto_scroll_btn):not(#gpu_mode_btn):hover {
          background: hsl(var(--accent-hue), 100%, calc(var(--accent-lightness) + 6%));
          color: var(--accent-text-color);
        }
    `;
    document.head.appendChild(styleSheet);

    /* inject new settings in the existing system settings popup table */
    let settings = [
        {
            id: "image_prompt",
            type: ParameterType.checkbox,
            label: "Show image prompt",
            note: "Show the prompt for each image. Useful with randomized prompts.",
            icon: "fa-eye",
            default: false
        }
    ];

    function injectParameters(parameters) {
        parameters.forEach(parameter => {
            var element = getParameterElement(parameter)
            var note = parameter.note ? `<small>${parameter.note}</small>` : "";
            var icon = parameter.icon ? `<i class="fa ${parameter.icon}"></i>` : "";
            var newRow = document.createElement('div')
            newRow.innerHTML = `
                <div>${icon}</div>
                <div><label for="${parameter.id}">${parameter.label}</label>${note}</div>
                <div>${element}</div>`
            //parametersTable.appendChild(newRow)
            parametersTable.insertBefore(newRow, parametersTable.children[13])
            parameter.settingsEntry = newRow
        })
    }
    injectParameters(settings)
    prettifyInputs(document);
    let showImagePrompt = document.querySelector("#image_prompt")
    
    // save/restore the setting
    showImagePrompt.addEventListener('change', (e) => {
        localStorage.setItem(settings[0].id, showImagePrompt.checked)
        updateShowImagePrompt()
    })
    showImagePrompt.checked = localStorage.getItem(settings[0].id) == null ? settings[0].default : localStorage.getItem(settings[0].id) === 'true'

    // change the stylesheet on the fly
    function getMainCSSIndex() {
        for (let i = 0; i < document.styleSheets.length; i++) {
            let sheet = document.styleSheets[i]
            if (sheet.href && sheet.href.includes('/media/css/main.css')) {
                return i
            }
        }
        return undefined
    }

    function updateShowImagePrompt() {
        if (showImagePrompt.checked) {
            showImagePromptBtn.classList.add('pressed')
        } else {
            showImagePromptBtn.classList.remove('pressed')
        }
        
        // getting the stylesheet
        if (getMainCSSIndex() !== undefined) {
            const stylesheet = document.styleSheets[getMainCSSIndex()]
            let elementRules
            
            // looping through all its rules and getting your rule
            for (let i = 0; i < stylesheet.cssRules.length; i++) {
                if(stylesheet.cssRules[i].selectorText === '.imgContainer .img_bottom_label') {
                    elementRules = stylesheet.cssRules[i]
                    
                    // modifying the rule in the stylesheet
                    elementRules.style.setProperty('display', showImagePrompt.checked ? 'block' : 'none')
                    break
                }
            }
        }
        else
        {
            console.log("Couldn't locate main.css")
        }
    }

    // add the show image prompt toggle button
    autoscrollBtn.insertAdjacentHTML('afterend', `
        <button id="show_image_prompt_btn" class="tertiaryButton">
            <i class="fa fa-eye icon"></i>
        </button>
    `);
    let showImagePromptBtn = previewTools.querySelector('#show_image_prompt_btn')

    showImagePromptBtn.addEventListener('click', function() {
        showImagePrompt.checked = !showImagePrompt.checked
        showImagePrompt.dispatchEvent(new Event("change"))
        updateShowImagePrompt()
    })
    showImagePrompt.addEventListener('change', updateShowImagePrompt)
    updateShowImagePrompt()
})()

let activeTags = []
let modifiers = []
let customModifiersGroupElement = undefined
let customModifiersInitialContent

let editorModifierEntries = document.querySelector("#editor-modifiers-entries")
let editorModifierTagsList = document.querySelector("#editor-inputs-tags-list")
let editorTagsContainer = document.querySelector("#editor-inputs-tags-container")
let modifierCardSizeSlider = document.querySelector("#modifier-card-size-slider")
let previewImageField = document.querySelector("#preview-image")
let modifierSettingsBtn = document.querySelector("#modifier-settings-btn")
let modifierSettingsOverlay = document.querySelector("#modifier-settings-config")
let customModifiersTextBox = document.querySelector("#custom-modifiers-input")
let customModifierEntriesToolbar = document.querySelector("#editor-modifiers-entries-toolbar")

const modifierThumbnailPath = "media/modifier-thumbnails"
const activeCardClass = "modifier-card-active"
const CUSTOM_MODIFIERS_KEY = "customModifiers"
const maxLabelLength = 30

function createModifierCard(name, previews, removeBy) {
    const modifierCard = document.createElement("div")
    let style = previewImageField.value
    let styleIndex = style == "portrait" ? 0 : 1

    modifierCard.className = "modifier-card"
    modifierCard.innerHTML = `
    <div class="modifier-card-overlay"></div>
    <div class="modifier-card-image-container">
        <div class="modifier-card-image-overlay">+</div>
        <p class="modifier-card-error-label"></p>
        <img onerror="this.remove()" alt="Modifier Image" class="modifier-card-image">
    </div>
    <div class="modifier-card-container">
        <div class="modifier-card-label"><p></p></div>
    </div>`

    const image = modifierCard.querySelector(".modifier-card-image")
    const errorText = modifierCard.querySelector(".modifier-card-error-label")
    const label = modifierCard.querySelector(".modifier-card-label")

    errorText.innerText = "No Image"

    if (typeof previews == "object") {
        image.src = previews[styleIndex] // portrait
        image.setAttribute("preview-type", style)
    } else {
        image.remove()
    }

    const cardLabel = removeBy ? name.replace("by ", "") : name

    if (cardLabel.length <= maxLabelLength) {
        label.querySelector("p").innerText = cardLabel
    } else {
        const tooltipText = document.createElement("span")
        tooltipText.className = "tooltip-text"
        tooltipText.innerText = name

        label.classList.add("tooltip")
        label.appendChild(tooltipText)

        label.querySelector("p").innerText = cardLabel.substring(0, maxLabelLength) + "..."
    }
    label.querySelector("p").dataset.fullName = name // preserve the full name

    return modifierCard
}

function createModifierGroup(modifierGroup, initiallyExpanded, removeBy) {
    const title = modifierGroup.category
    const modifiers = modifierGroup.modifiers

    const titleEl = document.createElement("h5")
    titleEl.className = "collapsible"
    titleEl.innerText = title

    const modifiersEl = document.createElement("div")
    modifiersEl.classList.add("collapsible-content", "editor-modifiers-leaf")

    if (initiallyExpanded === true) {
        titleEl.className += " active"
    }

    modifiers.forEach((modObj) => {
        const modifierName = modObj.modifier
        const modifierPreviews = modObj?.previews?.map(
            (preview) =>
                `${IMAGE_REGEX.test(preview.image) ? preview.image : modifierThumbnailPath + "/" + preview.path}`
        )

        const modifierCard = createModifierCard(modifierName, modifierPreviews, removeBy)

        if (typeof modifierCard == "object") {
            modifiersEl.appendChild(modifierCard)
            const trimmedName = trimModifiers(modifierName)

            modifierCard.addEventListener("click", () => {
                if (activeTags.map((x) => trimModifiers(x.name)).includes(trimmedName)) {
                //if (activeTags.map((x) => trimModifiers(x.originElement.querySelector(".modifier-card-label p").dataset.fullName)).includes(trimmedName)) {
                    // remove modifier from active array
                    //activeTags = activeTags.filter((x) => trimModifiers(x.name) != trimmedName)
                    activeTags = activeTags.filter((x) => trimModifiers(x.originElement.querySelector(".modifier-card-label p").dataset.fullName) != trimmedName)
                    toggleCardState(trimmedName, false)
                } else {
                    // add modifier to active array
                    activeTags.push({
                        name: modifierName,
                        element: modifierCard.cloneNode(true),
                        originElement: modifierCard,
                        previews: modifierPreviews,
                    })
                    toggleCardState(trimmedName, true)
                }

                refreshTagsList()
                //document.dispatchEvent(new Event("refreshImageModifiers"))
                saveImageModifiersState()
            })
        }
    })

    let brk = document.createElement("br")
    brk.style.clear = "both"
    modifiersEl.appendChild(brk)

    let e = document.createElement("div")
    e.className = "modifier-category"
    e.appendChild(titleEl)
    e.appendChild(modifiersEl)

    editorModifierEntries.insertBefore(e, customModifierEntriesToolbar.nextSibling)

    return e
}

function trimModifiers(tag) {
    // Remove trailing '-' and/or '+'
    tag = tag.replace(/[-+]+$/, "")
    // Remove parentheses at beginning and end
    return tag.replace(/^[(]+|[\s)]+$/g, "")
}

function toggleVisibility(elementId, visible) {
    const element = document.querySelector(elementId);
    if (visible) {
        element.style.display = "block";
    } else {
        element.style.display = "none";
    }
}

async function loadModifiers() {
    toggleVisibility("#editor-modifiers", false);
    try {
        let res = await fetch("/get/modifiers")
        if (res.status === 200) {
            res = await res.json()

            modifiers = res // update global variable

            res.reverse()

            res.forEach((modifierGroup, idx) => {
                //createModifierGroup(modifierGroup, idx === res.length - 1, modifierGroup === "Artist" ? true : false) // only remove "By " for artists
                createModifierGroup(modifierGroup, false, modifierGroup === "Artist" ? true : false) // only remove "By " for artists
            })

            createCollapsibles(editorModifierEntries)
        }
    } catch (e) {
        console.error("error fetching modifiers", e)
    }

    await loadCustomModifiers()
    resizeModifierCards(modifierCardSizeSlider.value)
    //document.dispatchEvent(new Event("loadImageModifiers"))
    loadCustomImageModifierCards()
    toggleVisibility("#editor-modifiers", true);
}

function refreshModifiersState(newTags, inactiveTags) {
    // clear existing modifiers
    document
        .querySelector("#editor-modifiers")
        .querySelectorAll(".modifier-card")
        .forEach((modifierCard) => {
            const modifierName = modifierCard.querySelector(".modifier-card-label p").dataset.fullName // pick the full modifier name
            if (activeTags.map((x) => x.name).includes(modifierName)) {
                modifierCard.classList.remove(activeCardClass)
                modifierCard.querySelector(".modifier-card-image-overlay").innerText = "+"
            }
        })
    activeTags = []

    // set new modifiers
    newTags.forEach((tag) => {
        let closestModifier = null;
        let minDistance = Infinity;
        let found = false
        document
            .querySelector("#editor-modifiers")
            .querySelectorAll(".modifier-card")
            .forEach((modifierCard) => {
                const modifierName = modifierCard.querySelector(".modifier-card-label p").dataset.fullName
                const shortModifierName = modifierCard.querySelector(".modifier-card-label p").innerText

                // calculate the Levenshtein distance
                let distance = levenshteinDistance(trimModifiers(tag), trimModifiers(modifierName));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestModifier = modifierCard;
                }
                
                if (trimModifiers(tag) == trimModifiers(modifierName)) {
                    // add modifier to active array
                    if (!activeTags.map((x) => x.name).includes(tag)) {
                        // only add each tag once even if several custom modifier cards share the same tag
                        const imageModifierCard = modifierCard.cloneNode(true)
                        imageModifierCard.querySelector(".modifier-card-label p").innerText = tag.replace(
                            modifierName,
                            shortModifierName
                        )
                        activeTags.push({
                            name: tag,
                            element: imageModifierCard,
                            originElement: modifierCard,
                        })
                    }
                    modifierCard.classList.add(activeCardClass)
                    modifierCard.querySelector(".modifier-card-image-overlay").innerText = "-"
                    found = true
                }
            })
        
        if (found == false) {
            /*
            if (closestModifier) {
                let shortTag = ""
                const imageModifierCard = closestModifier.cloneNode(true);
                const shortModifierName = closestModifier.querySelector(".modifier-card-label p").innerText;
                imageModifierCard.querySelector(".modifier-card-label p").innerText = tag.replace(trimModifiers(tag), shortModifierName);
                
                activeTags.push({
                    name: tag,
                    element: imageModifierCard,
                    originElement: closestModifier,
                    missing: true,
                });
                
                closestModifier.classList.add("partially-active-class");
                closestModifier.querySelector(".modifier-card-image-overlay").innerText = "-";
            } else {
            */
                // custom tag went missing, create one here
                let modifierCard = createModifierCard(tag, undefined, false); // create a modifier card for the missing tag, no image
                
                modifierCard.addEventListener("click", () => {
                    if (activeTags.map((x) => x.name).includes(tag)) {
                        // remove modifier from active array
                        activeTags = activeTags.filter((x) => x.name != tag);
                        modifierCard.classList.remove(activeCardClass);
                        modifierCard.querySelector(".modifier-card-image-overlay").innerText = "+";
                    }
                    refreshTagsList();
                });
        
                activeTags.push({
                    name: tag,
                    element: modifierCard,
                    originElement: undefined, // no origin element for missing tags
                    missing: true,
                });
            //}
        }
    })
    refreshTagsList(inactiveTags)
}

function refreshInactiveTags(inactiveTags) {
    // update inactive tags
    if (inactiveTags !== undefined && inactiveTags.length > 0) {
        activeTags.forEach(tag => {
            const trimmedTagName = trimModifiers(tag.name);
            if (inactiveTags.some(element => trimModifiers(element) === trimmedTagName)) {
                tag.inactive = true;
            }
        });
    }

    // update cards
    let overlays = document.querySelector("#editor-inputs-tags-list").querySelectorAll(".modifier-card-overlay")
    overlays.forEach((i) => {
        let modifierName = i.parentElement.getElementsByClassName("modifier-card-label")[0].getElementsByTagName("p")[0]
            .dataset.fullName
        const trimmedModifierName = trimModifiers(modifierName);
        if (inactiveTags && inactiveTags.some(element => trimModifiers(element) === trimmedModifierName)) {
            i.parentElement.classList.add("modifier-toggle-inactive");
        }
    })
}

function refreshTagsList(inactiveTags) {
    editorModifierTagsList.innerHTML = ""

    if (activeTags.length == 0) {
        editorTagsContainer.style.display = "none"
        return
    } else {
        editorTagsContainer.style.display = "block"
    }

    activeTags.forEach((tag, index) => {
        tag.element.querySelector(".modifier-card-image-overlay").innerText = "-"
        tag.element.classList.add("modifier-card-tiny")

        // Check if the tag was marked as missing and add the missingTag class
        if (tag.missing) {
            tag.element.classList.add("missing-tag");
        }
        
        editorModifierTagsList.appendChild(tag.element)

        tag.element.addEventListener("click", () => {
            let idx = activeTags.findIndex((o) => {
                return o.name === tag.name
            })

            if (idx !== -1) {
                //toggleCardState(activeTags[idx].name, false)
                toggleCardState(activeTags[idx].originElement.querySelector(".modifier-card-label p").dataset.fullName, false)

                activeTags.splice(idx, 1)
                refreshTagsList()
            }
            //document.dispatchEvent(new Event("refreshImageModifiers"))
            saveImageModifiersState()
        })
    })

    let brk = document.createElement("br")
    brk.style.clear = "both"
    editorModifierTagsList.appendChild(brk)
    refreshInactiveTags(inactiveTags)
    //document.dispatchEvent(new Event("refreshImageModifiers")) // notify plugins that the image tags have been refreshed
    saveImageModifiersState()
    renameMakeImageButton()
}

function toggleCardState(modifierName, makeActive) {
    document
        .querySelector("#editor-modifiers")
        .querySelectorAll(".modifier-card")
        .forEach((card) => {
            const name = card.querySelector(".modifier-card-label p").dataset.fullName // pick the full modifier name
            if (
                trimModifiers(modifierName) == trimModifiers(name) ||
                trimModifiers(modifierName) == "by " + trimModifiers(name)
            ) {
                if (makeActive) {
                    card.classList.add(activeCardClass)
                    card.querySelector(".modifier-card-image-overlay").innerText = "-"
                } else {
                    card.classList.remove(activeCardClass)
                    card.classList.remove("partially-active-class")
                    card.querySelector(".modifier-card-image-overlay").innerText = "+"
                }
            }
        })
}

function changePreviewImages(val) {
    const previewImages = document.querySelectorAll(".modifier-card-image-container img")

    let previewArr = []

    modifiers.map((x) => x.modifiers).forEach((x) => previewArr.push(...x.map((m) => m.previews)))

    previewArr = previewArr.map((x) => {
        let obj = {}

        x.forEach((preview) => {
            obj[preview.name] = preview.path
        })

        return obj
    })

    previewImages.forEach((previewImage) => {
        const currentPreviewType = previewImage.getAttribute("preview-type")
        const relativePreviewPath = previewImage.src.split(modifierThumbnailPath + "/").pop()

        const previews = previewArr.find((preview) => relativePreviewPath == preview[currentPreviewType])

        if (typeof previews == "object") {
            let preview = null

            if (val == "portrait") {
                preview = previews.portrait
            } else if (val == "landscape") {
                preview = previews.landscape
            }

            if (preview != null) {
                previewImage.src = `${modifierThumbnailPath}/${preview}`
                previewImage.setAttribute("preview-type", val)
            }
        }
    })
}

function resizeModifierCards(val) {
    const cardSizePrefix = "modifier-card-size_"
    const modifierCardClass = "modifier-card"

    const modifierCards = document.querySelectorAll(`.${modifierCardClass}`)
    const cardSize = (n) => `${cardSizePrefix}${n}`

    modifierCards.forEach((card) => {
        // remove existing size classes
        const classes = card.className.split(" ").filter((c) => !c.startsWith(cardSizePrefix))
        card.className = classes.join(" ").trim()

        if (val != 0) {
            card.classList.add(cardSize(val))
        }
    })
}

modifierCardSizeSlider.onchange = () => resizeModifierCards(modifierCardSizeSlider.value)
previewImageField.onchange = () => changePreviewImages(previewImageField.value)

modifierSettingsBtn.addEventListener("click", function(e) {
    modifierSettingsOverlay.classList.add("active")
    customModifiersTextBox.setSelectionRange(0, 0)
    customModifiersTextBox.focus()
    customModifiersInitialContent = customModifiersTextBox.value // preserve the initial content
    e.stopPropagation()
})

modifierSettingsOverlay.addEventListener("keydown", function(e) {
    switch (e.key) {
        case "Escape": // Escape to cancel
            customModifiersTextBox.value = customModifiersInitialContent // undo the changes
            modifierSettingsOverlay.classList.remove("active")
            e.stopPropagation()
            break
        case "Enter":
            if (e.ctrlKey) {
                // Ctrl+Enter to confirm
                modifierSettingsOverlay.classList.remove("active")
                e.stopPropagation()
                break
            }
    }
})

function saveCustomModifiers() {
    localStorage.setItem(CUSTOM_MODIFIERS_KEY, customModifiersTextBox.value.trim())

    loadCustomModifiers()
}

async function loadCustomModifiers() {
    let imageModifierFilter
    let customSection = false

    // pull custom modifiers from legacy storage
    let inputCustomModifiers = localStorage.getItem(CUSTOM_MODIFIERS_KEY)
    if (inputCustomModifiers !== null) {
        customModifiersTextBox.value = inputCustomModifiers
        inputCustomModifiers = inputCustomModifiers.replace(/^\s*$(?:\r\n?|\n)/gm, "") // remove empty lines
        inputCustomModifiers = inputCustomModifiers.replace(/ +/g, " "); // replace multiple spaces with a single space
    }
    if (inputCustomModifiers !== null && inputCustomModifiers !== '') {
        inputCustomModifiers = importCustomModifiers(inputCustomModifiers)
    }
    else
    {
        inputCustomModifiers = []
    }
    // pull custom modifiers from persistent storage
    sharedCustomModifiers = await getStorageData(CUSTOM_MODIFIERS_KEY)
    if (sharedCustomModifiers === undefined) {
        sharedCustomModifiers = inputCustomModifiers
        saveCustomCategories()
    }
    else
    {
        sharedCustomModifiers = JSON.parse(sharedCustomModifiers)
        
        // update existing entries if something changed
        if (updateEntries(inputCustomModifiers, sharedCustomModifiers)) {
            saveCustomCategories()
        }
    }
    loadModifierList()
    
    // collapse the first preset section
    /*
    let preset = editorModifierEntries.getElementsByClassName('collapsible active')[0]
    if (preset !==  undefined) {
        closeCollapsible(preset.parentElement) // toggle first preset section
    }
    */
    // set up categories auto-collapse
    autoCollapseCategories()

    // refresh modifiers in the UI
    function loadModifierList() {
        let customModifiersGroupElementArray = Array.from(editorModifierEntries.querySelectorAll('.custom-modifier-category'));
        if (Array.isArray(customModifiersGroupElementArray)) {
            customModifiersGroupElementArray.forEach(div => div.remove())
        }
        if (customModifiersGroupElement !== undefined) {
            customModifiersGroupElement.remove()
            customModifiersGroupElement = undefined
        }
        customModifiersGroupElementArray = []

        if (sharedCustomModifiers && sharedCustomModifiers.length > 0) {
            let category = 'Custom Modifiers'
            let modifiers = []
            Object.keys(sharedCustomModifiers).reverse().forEach(item => {
                // new custom category
                const elem = createModifierGroup(sharedCustomModifiers[item], false, false)
                elem.classList.add('custom-modifier-category')
                customModifiersGroupElementArray.push(elem)
                createCollapsibles(elem)
                makeModifierCardDropAreas(elem)
                customSection = true
            })
            if (Array.isArray(customModifiersGroupElementArray)) {
                customModifiersGroupElementArray[0].classList.add('modifier-separator')
            }
            if (customModifiersGroupElement !== undefined) {
                customModifiersGroupElement.classList.add('modifier-separator')
            }

            // move the searchbox atop of the image modifiers list. create it if needed.
            imageModifierFilter = document.getElementById("image-modifier-filter") // search box
            if (imageModifierFilter !== null) {
                customModifierEntriesToolbar.insertAdjacentElement('afterend', imageModifierFilter);
            }
        }
    }

    // extract LoRA tags from strings
    function extractLoraTags(imageTag) {
        // Define the regular expression for the tags
        const regex = /<lora:([^:>]+)(?::([^:>]*))?(?::([^:>]*))?>/gi;
    
        // Initialize an array to hold the matches
        let matches = [];
    
        // Iterate over the string, finding matches
        for (const match of imageTag.matchAll(regex)) {
            // Initialize an object to hold a match
            let loraTag = {
                loraname: match[1],
            };
    
            // If weight is provided, add it to the loraTag object
            if (match[2] !== undefined && match[2] !== '') {
                loraTag.weight = parseFloat(match[2]);
            }
    
            // If blockweights are provided, add them to the loraTag object
            if (match[3] !== undefined && match[3] !== '') {
                loraTag.blockweights = match[3];
            }
    
            // Add the loraTag object to the array of matches
            matches.push(loraTag);
        }
    
        // Clean up the imageTag string
        let cleanedImageTag = imageTag.replace(regex, '').trim();
    
        // Return the array of matches and cleaned imageTag string
        return {
            LoRA: matches,
            imageTag: cleanedImageTag
        };
    }

    // transform custom modifiers from flat format to structured object
    function importCustomModifiers(input) {
        let res = [];
        let lines = input.split("\n");
        let currentCategory = "Custom Modifiers";
        let currentModifiers = [];
        for (let line of lines) {
            if (line.startsWith("#")) {
                if (currentModifiers.length > 0) {
                    res.push({ category: currentCategory, modifiers: currentModifiers });
                }
                currentCategory = line.substring(1);
                currentModifiers = [];
            } else {
                const dropAnImageHere = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAM4AAADOCAIAAAD5faqTAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAEnQAABJ0Ad5mH3gAAApMSURBVHhe7dw7kty4EoXhWUAvQ4vrRWgJdwW9gfbljy1XrkyZ48mUd+8JZtYJNF58FMXLUfyfoSDBJAgCSYDVUaW/Pn369Bfwm5FmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANDx+fPn/zTy2Jpnzg2K//vhy5cvqjAPDLRXXD2l9Pr6Gmflfs9qjA5li7e1eV5biIt2q2pvWfLYv4hu478DP3/+/Pbt26QfJ+f++PHj7e0t43rUs6o8oz/SdTWEGffR5Irfv3/fMgDv7+8Rr6tnUUMNUMCvX79y/+FYm9WqiJk3Tz0WYbn/8Ewn34s7YuLr168Z/dHquaPh1HhrIDNoGSf1mvs6/PPPPxldWL2ias7QscgkUepkUcG5WKXO820+lmqHO/l2fCdVz6q8fILnnVieq/HTrkelfezKvlMSV+Ndjqh6P0sfulfUc6/dKBfF5IEBJ1N3kLpT2iltnjdsNdV2dfIdde/ENIpKsgho57bJuR7OtuvdQYrJooYnnipmckW9M8UhraRZNNbNJ3Gzq/pPabM2sqhnV6oFt7bt5Dua3EnQA+SOVuZl6WJ+bhyS3F84IUaLcnDN1Ww6v6IHO/fHRinVTcGz2qyNLOo5kGoShyT372x+J0GHIqZacQ70gufIag1qdSPnVxyNVlebVaP8O6vN2siiHlItRYyGJ/cXW3qhesSjcMuErykkgsv1aH7FXanWJlYkSruqRtjzbdZGFvU8k2pVJ9/U/E7Mz2vuLybn+iOFVp8sKuLnK1HozjHz1sZC3+bKSDmxjWo+sc3ayKKeA6nW7eT7mtxJSe/aEVb2l8/VPWs7qLvda9XT5pee+bWCqmqDu4VBJXGo+7myy5mhjRi2Nk1PbLM2sqhnNdU2dvJ9qd3R4nlXeiAVn0XFuS2NWVuhK5lfK3Qb1i3Ui5Fr1nVX36hKMbHFv9I2zDW3h1rzNmsji3pWU63V7eT76vZOy28hZX9NeqE7tZw4bF3q+uoz8ipPbNJOaXJim7WRRT0HUm37/H0L3d5puSPmnwc10l5q2444cTGqKEt0uV3zmU2mNLnPAuo65518X93eae36WOCOqP6K7fgtr9geY21kUVGDuljbYe9MVlHjo05VlUUFFcbR59vcrd+2p1oYdfJ9je6kpNkiYtQdWbQYnev46o11VN6lZIrgMpO2tHaveaqd2GYt1lnUE6nWXmVvJ9/XlsHzYJQPq0zO7Xa6eLVST2XRgNZEhSk+9xdbWruX706VZ9FHZ7V5Pi9GTPUwy4FOvqnVwdNtRA+2b82TczWrxyF1RxYt/PFi3u8e/qrm1dYe4Gup8iz66Mk2SzcFS/50Uj3McqCTb2o+eDoa3STt/D8/15NB7i80MUwqDO73Xcl9mKqKOlV5Fn30ZJvF088oJ6Kvuuce6OSb8p2oF7RtujG9BMQh6T7QCouj3V7wEFZPqkdF9G5bvtVq22+7ovrzwMP8ise4ne3l7Jk2S5msWiJ9uspVsw+1U5oc6+Q78p2M6Lkpe7Y07wX1YxxtF45y5LrU+92Lzq94zJZUk8NtDn4PGRmtzoc7+XbKB66kh0/znPo343rcC6MwP+66ShY9qET1t5dWl03SaPWKBzjVVl+uj7W51D1dvTTJ8mc6GR9ogNWb4d/SWU+2uTw9iwAAAAAAAAAAAAAAAAAAwHGjL+X5K3u5v02cIrk/FmGrX3Ztvb6+vr29/f2g7ckXEssvHrY2fpMxgnNnYBSztwHd+Dw2cMo9/nZqSnw/uPrhg1of5WHyNflS+QuOb9OfiOloxu35avL7+3v5a5qSytvvQFd30Wp/aNkadVFJGR8xCs6ixd4GTOLLH7yUTrnHK7gf1VlZtHB52PKb6eqU+R2W36mvLj2iCvOEhZqkkirzql9/VE1q6dnI0LFRF5VGqba3Aavx7QN8yj1eYdSPLvcA6+nJYwMxUXnsJ6mm6Sdifi6/W9zy8x5Xq+B29tLjHu2sLjq6u122VLKaahsb0I3XrK9dP5zV3HbKPV5h1FCXOy3mC6JEmOMnqRbrrAL8S/F5Hntdnj+ganO1xp0yDFsq0aGIUXAWLfY2YBI/6thT7vEKo4a6XBsx0nqq8lhP9HXELOfNUi0C1Hd6XmN78p8S6CGOmC2LeOWUYdhSSdy+KDiLFnsbMI+PQ5L7i1Pu8QqjhrpcGx7sduWyWApj5ovgUapp4omA2I2VcZLHqifi1ZIs2uyUYdhSiQ5FTNXIvQ2Yx8chyf3FKfd4hVFDXa4N7caLwmhecS7GOhjbo1SL3PJS6MyrXkGCp70DU5qcMgxbKtGhiInusr0NmMfHoaorTrnHK4wa6nJtaHf+UhUTj7sgIrup5tTxBOmS7rugk/hYP54yDFsq0aGIie6yvQ2YxMenLvkd76NXGDXU5drQ7iQh2uyJ3W6qeUhyfxHzXFUYHN+d81b5LrS+qz2VyftAaV5JiPcHie6yvQ1wvPpZ20FhCo7ydnZXQBx65h6v4IbOU03Ubu22L1Ux4ZXly3n9VIshqT5IqjvilLZfnGpuhkV5parZd9HVbWFrXkmlaufeBkzi1cPVGIVT7vEKbuhqqo0SIl7jyo+QEdbepP+u3aZUlLen7E21qgbfhcpVVaWts8uVPDOrKSavWmgb4PhW9wVD9l7i/8YNVbOyaOHysq3thwPnn5bRLBrnTbxttPOixN9TpKxH1KoobxdQJa7aZrEKVxdVeZxe3d0uWypxOxWcRYu9DWjjdZvunG62nXKPVxg11OXayKLizdQfDuJprgY4YtpUi0zVKbpWRcFxVvXO61Se/OEtRA1/XqoFZ1v7yJ1yj1cYNdTl2siiYgWMx8sx1YIYhdWo+7PkXPXa688cStAsGvizU839MPlY8Mw9XmHUUJdrI4sWsU7FIjhaEJfz6lH3c6nyLr/ueMoMcUVp3/BKqkEx+jf3F6cMw5ZKdChiqu7a24BJfLukhFPu8QqjhrpcG1m08Irmzm3vMMqrUY/C6hNiabRWurz7kmd/fKp5Waje2E65xyuMGupybWTRQ5Rb9SIvUV6OutNlPjP5ZS73HyKNRDNc9UzbH59q4ok/9xen3OMVRg11uTay6MEzuXRnqThUjnrkwXxaEtfcvvx6GRWFKSBSXP9q2yeOUk0B2m6NEreksKhkMpY6FDEKzqKFz93YAJVEfPdavkr54cmnPHOPV1BToqHbU82HpM0JiUMedb/Sqi+iZGS0RgS/7U1Ui2/Z1K7V7JdRF5VWU22kasD8Wu7JcuI/5R6v4IZWS5vLtZFFhZjJ25UuxDroCc+rZ7eqSpw76h3V0E04tSSe6Yx70NhEhSOjWyi5Kyarv780ULVhbwNWr+XbV81Rcso9YkiLgkYlZBEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHMvLy+5Bfw2Ly8v/wNatp01zLgrNAAAAABJRU5ErkJggg=="
                
                let { LoRA, imageTag } = extractLoraTags(line);
                if (LoRA.length > 0) {
                    currentModifiers.push({
                        modifier: imageTag,
                        LoRA: LoRA,
                        previews: [
                            { name: "portrait", image: dropAnImageHere },
                            { name: "landscape", image: "" }
                        ]
                    });
                } else {
                    currentModifiers.push({
                        modifier: line,
                        previews: [
                            { name: "portrait", image: dropAnImageHere },
                            { name: "landscape", image: "" }
                        ]
                    });
                }
            }
        }
        res.push({ category: currentCategory, modifiers: currentModifiers });
        return res;
    }
    
    // transform custom modifiers from structured object to flat format
    function exportCustomModifiers(json) {
        let result = '';
    
        json.forEach(item => {
            result += '#' + item.category + '\n';
            item.modifiers.forEach(modifier => {
                let modifierString = modifier.modifier;
                // Check if modifier has a LoRA array and it is not empty
                if (modifier.LoRA && modifier.LoRA.length > 0) {
                    modifier.LoRA.forEach(lora => {
                        let loraname = lora.loraname || lora.filename; // ensure backward compatibility
                        let weight = lora.weight || lora.multiplier; // ensure backward compatibility
    
                        modifierString += ' <lora:' + loraname;
                        // Check if loraTag has a weight/multiplier
                        if (weight) {
                            modifierString += ':' + weight;
                            // Check if loraTag has blockweights (only if there's a weight/multiplier)
                            if (lora.blockweights) {
                                modifierString += ':' + lora.blockweights;
                            }
                        }
                        modifierString += '>';
                    });
                }
                result += modifierString + '\n';
            });
            result += '\n'; // Add a new line after each category
        });
    
        return result;
    }
    
    function updatePortraitBasedOnDistance(newModifier, allExistingModifiers) {
        let closestModifier = null;
        let minDistance = Infinity;

        for (let k = 0; k < allExistingModifiers.length; k++) {
            let distance = levenshteinDistance(newModifier.modifier, allExistingModifiers[k].modifier);
            if (distance < minDistance) {
                minDistance = distance;
                closestModifier = allExistingModifiers[k];
            }
        }

        const normalizedDistance = minDistance / closestModifier.modifier.length;

        // Threshold
        const maxAllowedNormalizedDistance = 0.5;

        if (closestModifier 
            && (minDistance < 50 || normalizedDistance <= maxAllowedNormalizedDistance)) {
            
            const portraitPreview = newModifier.previews.find(p => p.name === "portrait");
            const matchingPortraitPreview = closestModifier.previews.find(p => p.name === "portrait");
            if (portraitPreview && matchingPortraitPreview) {
                portraitPreview.image = matchingPortraitPreview.image;
            }
        }
    }

    // update entries. add and remove categories/modifiers as needed.
    function updateEntries(newEntries, existingEntries) {
        let updated = false;
        // Make a copy to store all the existing modifiers even if some get removed
        let allExistingModifiers = existingEntries.map(entry => entry.modifiers).flat();

        // loop through each category in existingEntries
        for (let i = 0; i < existingEntries.length; i++) {
            let existingCategory = existingEntries[i];
            let newCategory = newEntries.find(entry => entry.category.toLowerCase() === existingCategory.category.toLowerCase());
        
            if (newCategory) {
                // if category exists in newEntries, update its modifiers
                let newModifiers = newCategory.modifiers;
                let existingModifiers = existingCategory.modifiers;
        
                // loop through each modifier in existingModifiers
                for (let j = 0; j < existingModifiers.length; j++) {
                    let existingModifier = existingModifiers[j];
                    const newModifier = newModifiers.find(mod => mod.modifier.toLowerCase().trim() === existingModifier.modifier.toLowerCase().trim());
        
                    if (newModifier) {
                        if (existingModifier.LoRA || newModifier.LoRA) {
                            // if modifier exists in newModifiers, completely replace existingModifier with newModifier
                            // Check if LoRA arrays exist and if they are different
                            if (existingModifier.LoRA && newModifier.LoRA) {
                                // Overwrite LoRA in existingModifiers
                                existingModifier.LoRA = newModifier.LoRA;
                                updated = true;
                            } else if (existingModifier.LoRA && !newModifier.LoRA) {
                                // Remove LoRA from existingModifier if it doesn't exist in newModifier
                                delete existingModifier.LoRA;
                                updated = true;
                            } else if (!existingModifier.LoRA && newModifier.LoRA) {
                                // Add LoRA to existingModifier if it exists in newModifier
                                existingModifier.LoRA = newModifier.LoRA;
                                updated = true;
                            }
                            //console.log(existingModifier.LoRA, newModifier.LoRA)
                        }
                    } else {
                        // if modifier doesn't exist in newModifiers, remove it from existingModifiers
                        existingModifiers.splice(j, 1);
                        j--;
                        updated = true;
                    }
                }
        
                // loop through each modifier in newModifiers
                for (let j = 0; j < newModifiers.length; j++) {
                    let newModifier = newModifiers[j];
                    let existingIndex = existingModifiers.findIndex(mod => mod.modifier.toLowerCase().trim() === newModifier.modifier.toLowerCase().trim());

                    if (existingIndex === -1) {
                        // Modifier doesn't exist in existingModifiers, so insert it at the same index in existingModifiers
                        existingModifiers.splice(j, 0, newModifier);
                        updated = true;

                        updatePortraitBasedOnDistance(newModifier, allExistingModifiers);
                    }
                }
            } else {
                // if category doesn't exist in newEntries, remove it from existingEntries
                existingEntries.splice(i, 1);
                i--;
                updated = true;
            }
        }
        
        // loop through each category in newEntries
        for (let i = 0; i < newEntries.length; i++) {
            let newCategory = newEntries[i];
            let existingCategoryIndex = existingEntries.findIndex(entry => entry.category.toLowerCase() === newCategory.category.toLowerCase());

            if (existingCategoryIndex === -1) {
                // if category doesn't exist in existingEntries, insert it at the same position
                existingEntries.splice(i, 0, newCategory)
                updated = true;

                // Loop through modifiers of this newly added category to update its portrait image
                for (let j = 0; j < newCategory.modifiers.length; j++) {
                    updatePortraitBasedOnDistance(newCategory.modifiers[j], allExistingModifiers);
                }
            }
        }

        return updated;
    }

    async function handleImage(img, imageElement) {
        try {
            const resizedBase64Img = await resizeImage(img, 128, 128);
            imageElement.src = resizedBase64Img;
    
            // update the active tags if needed
            updateActiveTags()
    
            // save the customer modifiers
            const category = imageElement.closest('.modifier-category').querySelector('h5').innerText.slice(1)
            const modifier = imageElement.closest('.modifier-card').querySelector('.modifier-card-label > p').dataset.fullName
            setPortraitImage(category, modifier, resizedBase64Img)
            saveCustomCategories()
        } catch (error) {
            // Log the error message to the console
            console.error(error);
        }
    }

    function makeModifierCardDropAreas(elem) {
        const modifierCards = elem.querySelectorAll('.modifier-card');
        modifierCards.forEach(modifierCard => {
            const overlay = modifierCard.querySelector('.modifier-card-overlay');
            overlay.addEventListener('dragover', e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });
            overlay.addEventListener('drop', e => {
                e.preventDefault();
                
                // Find the first image file, uri, or moz-url in the items list
                let imageItem = null;
                for (let i = 0; i < e.dataTransfer.items.length; i++) {
                    let item = e.dataTransfer.items[i];
                    if ((item.kind === 'file' && item.type.startsWith('image/')) || item.type === 'text/uri-list') {
                        imageItem = item;
                        break;
                    } else if (item.type === 'text/x-moz-url') {
                        // If there are no image files or uris, fallback to moz-url
                        if (!imageItem) {
                            imageItem = item;
                        }
                    }
                }
            
                if (imageItem) {
                    const imageContainer = modifierCard.querySelector('.modifier-card-image-container');
                    if (imageContainer.querySelector('.modifier-card-image') === null) {
                        imageContainer.insertAdjacentHTML('beforeend', `<img onerror="this.remove()" alt="Modifier Image" class="modifier-card-image">`)
                    }
                    const imageElement = imageContainer.querySelector('img');
                    
                    // Create an img element for the dropped image file
                    let img = new Image();
            
                    if (imageItem.kind === 'file') {
                        // If the item is an image file, handle it as before
                        let file = imageItem.getAsFile();
            
                        // Create a FileReader object to read the dropped file as a data URL
                        let reader = new FileReader();
                        reader.onload = function(e) {
                            // Set the src attribute of the img element to the data URL
                            img.src = e.target.result;
                            handleImage(img.src, imageElement)
                        };
                        reader.readAsDataURL(file);
                    } else {
                        // If the item is a URL, retrieve it and use it to load the image
                        imageItem.getAsString(function(url) {
                            // Set the src attribute of the img element to the URL
                            img.src = url;
                            handleImage(img.src, imageElement)
                        });
                    }
                }
            });
        });
    }
    
    function setPortraitImage(category, modifier, image) {
        const categoryObject = sharedCustomModifiers.find(obj => obj.category === category)
        if (!categoryObject) return
    
        const modifierObject = categoryObject.modifiers.find(obj => obj.modifier === modifier)
        if (!modifierObject) return
    
        const portraitObject = modifierObject.previews.find(obj => obj.name === "portrait")
        if (!portraitObject) return
    
        portraitObject.image = image
    }

    function resizeImage(srcImage, width, height) {
        // Return a new Promise object that will resolve with the resized image data
        return new Promise(function(resolve, reject) {
            // Create an Image object with the original base64 image data
            const img = new Image();
            
            // Set up a load event listener to ensure the image has finished loading before resizing it
            img.onload = function() {
                // Create a canvas element
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                
                // Draw the original image on the canvas with bilinear interpolation
                const ctx = canvas.getContext("2d");
                ctx.imageSmoothingEnabled = true
                if (ctx.imageSmoothingQuality !== undefined) {
                    ctx.imageSmoothingQuality = 'high'
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                // Get the base64-encoded data of the resized image
                const resizedImage = canvas.toDataURL();
                
                // Resolve the Promise with the base64-encoded data of the resized image
                resolve(resizedImage);
            };
                
            // Set up an error event listener to reject the Promise if there's an error loading the image
            img.onerror = function() {
                reject("Error loading image");
            };
        
            // Set the source of the Image object to the input base64 image data
            img.src = srcImage;
        });
    }

    async function saveCustomCategories() {
        setStorageData(CUSTOM_MODIFIERS_KEY, JSON.stringify(sharedCustomModifiers))                
    }

    /* CLEAR ALL AND ADD BUTTONS */
    let editorModifiers
    let editorModifiersPopup
    if (document.querySelector('#imageTagCommands') === null) {
        editorModifierTagsList?.insertAdjacentHTML('beforeBegin', `
            <div id="imageTagCommands"><button class="secondaryButton clearAllImageTags">Clear all</button><button id='addImageTag' class="secondaryButton">Add modifiers</button></div>
        `)
        
        editorModifiers = document.getElementById("editor-modifiers");
        editorModifiers?.insertAdjacentHTML('beforeBegin', `
            <div id="imageTagPopupContainer" tabindex="0"></div>
        `)
        editorModifiersPopup = document.getElementById("imageTagPopupContainer");
        editorModifiersPopup.appendChild(editorModifiers);

        document.querySelector('.clearAllImageTags').addEventListener('click', function(e) {
            e.stopPropagation()
            
            // clear existing image tag cards
            editorTagsContainer.style.display = 'none'
            editorModifierTagsList.querySelectorAll('.modifier-card').forEach(modifierCard => {
                modifierCard.remove()
            })
    
            // reset modifier cards state
            document.querySelector('#editor-modifiers').querySelectorAll('.modifier-card').forEach(modifierCard => {
                const modifierName = modifierCard.querySelector('.modifier-card-label').innerText
                if (activeTags.map(x => x.name).includes(modifierName)) {
                    modifierCard.classList.remove(activeCardClass)
                    modifierCard.querySelector('.modifier-card-image-overlay').innerText = '+'
                }
            })
            activeTags = []
            //document.dispatchEvent(new Event('refreshImageModifiers')) // notify image modifiers have changed
            saveImageModifiersState()
        })

        document.querySelector('#addImageTag').addEventListener('click', function(e) {
            e.stopPropagation()
        
            editorModifiers.classList.add("active");
            editorModifiersPopup.classList.add("popup", "active");
            imageModifierFilter.focus()
            imageModifierFilter.select()
        })
        
        editorModifiersPopup.addEventListener('keydown', function(e) {   
            if (e.key === "Escape") {
                /*
                if (imageModifierFilter.value !== '') {
                    imageModifierFilter.value = ''
                    filterImageModifierList()
                }
                else
                {
                    editorModifiers.classList.remove("active");
                    editorModifiersPopup.classList.remove("popup", "active");
                }
                e.stopPropagation()
                */
                editorModifiers.classList.remove("active");
                editorModifiersPopup.classList.remove("popup", "active");
                e.stopPropagation()
            } else if (event.ctrlKey && event.key === 'Enter') {
                // Ctrl+Enter key combination. Hide the dialog and let the event bubble up, which will trigger the image generation.
                editorModifiersPopup.classList.remove("popup", "active");
            }
        })

        editorModifiersPopup.addEventListener('click', function(e) {
            if (event.target === editorModifiersPopup) {
                editorModifiers.classList.remove("active");
                editorModifiersPopup.classList.remove("popup", "active");
                e.stopPropagation()
            }
        })
    }
}

// collapsing other categories
function openCollapsible(element) {
    const collapsibleHeader = element.querySelector(".collapsible");
    const handle = element.querySelector(".collapsible-handle");
    collapsibleHeader.classList.add("active")
    let content = getNextSibling(collapsibleHeader, '.collapsible-content')
    if (collapsibleHeader.classList.contains("active")) {
        content.style.display = "block"
        if (handle != null) {  // render results don't have a handle
            handle.innerHTML = '&#x2796;' // minus
        }
    }
    document.dispatchEvent(new CustomEvent('collapsibleClick', { detail: collapsibleHeader }))
}

function closeCollapsible(element) {
    const collapsibleHeader = element.querySelector(".collapsible");
    const handle = element.querySelector(".collapsible-handle");
    collapsibleHeader.classList.remove("active")
    let content = getNextSibling(collapsibleHeader, '.collapsible-content')
    if (!collapsibleHeader.classList.contains("active")) {
        content.style.display = "none"
        if (handle != null) {  // render results don't have a handle
            handle.innerHTML = '&#x2795;' // plus
        }
    }
    document.dispatchEvent(new CustomEvent('collapsibleClick', { detail: collapsibleHeader }))
}

function collapseOtherCategories(elem) {
    const modifierCategories = document.querySelectorAll('.modifier-category');
    modifierCategories.forEach(category => {
        if (category !== elem) {
            closeCollapsible(category)
            //elem.scrollIntoView({ block: "nearest" })
        }
    });
}

function autoCollapseCategories() {
    const modifierCategories = document.querySelectorAll('.modifier-category');
    modifierCategories.forEach(modifierCategory => {
        modifierCategory.addEventListener('click', function(e) {
            if (imageModifierFilter.value === '') {
                collapseOtherCategories(e.target.closest('.modifier-category'))
            }
        });
    });
}
//document.dispatchEvent(new Event('loadImageModifiers')) // refresh image modifiers
//loadCustomImageModifierCards()

function getLoRAFromActiveTags(activeTags, imageModifiers) {
    // Prepare a result array
    let result = [];

    // Iterate over activeTags
    for (let tag of activeTags) {
        // Check if the tag is marked active
        if (!tag.inactive) {
            // Iterate over the categories in imageModifiers
            for (let category of imageModifiers) {
                // Iterate over the modifiers in the current category
                for (let modifier of category.modifiers) {
                    // Check if the tag name matches the modifier
                    if (trimModifiers(tag.name.toLowerCase()) === trimModifiers(modifier.modifier.toLowerCase())) {
                        // If there's a LoRA value, add it to the result array
                        if (modifier.LoRA && modifier.LoRA.length > 0) {
                            result.push(modifier.LoRA);
                        }
                    }
                }
            }
        }
    }

    // If no LoRA tags were found, return null
    if (result.length === 0) {
        return null;
    }

    // Return the result array
    return result.flat();
}

function isLoRAInActiveTags(activeTags, imageModifiers, givenLoRA) {
    // Iterate over activeTags
    for (let tag of activeTags) {
        // Iterate over the categories in imageModifiers
        for (let category of imageModifiers) {
            // Iterate over the modifiers in the current category
            for (let modifier of category.modifiers) {
                // Check if the tag name matches the modifier
                if (trimModifiers(tag.name) === trimModifiers(modifier.modifier)) {
                    // Check if there's a LoRA value
                    if (modifier.LoRA) {
                        // Iterate over each LoRA object
                        for(let loraObject of modifier.LoRA) {
                            // Check if the filename matches the given LoRA
                            if(loraObject.loraname.toLowerCase() === givenLoRA?.toLowerCase()) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
    }

    // If the given LoRA was not found in activeTags, return false
    return false;
}

function isLoRAInImageModifiers(imageModifiers, givenModifier) {
    for (let category of imageModifiers) {
        for (let modifier of category.modifiers) {
            // Check if the given modifier matches and if it has a LoRA property
            if (modifier.modifier.toLowerCase().trim() === givenModifier.toLowerCase().trim() && modifier.LoRA) {
                // If the modifier has any LoRA object associated, return true
                if(modifier.LoRA.length > 0) {
                    return true;
                }
            }
        }
    }

    // If the given modifier was not found or it doesn't have a LoRA, return false
    return false;
}

function showLoRAs() {
    let overlays = document.querySelectorAll(".custom-modifier-category .modifier-card-overlay, .modifier-card-tiny .modifier-card-overlay")
    overlays.forEach((card) => {
        let modifierName = card.parentElement.getElementsByClassName("modifier-card-label")[0].getElementsByTagName("p")[0].dataset.fullName
        modifierName = trimModifiers(modifierName)
        if (isLoRAInImageModifiers(sharedCustomModifiers, modifierName)) {
            //console.log("LoRA modifier:", modifierName)
            card.parentElement.classList.add('lora-card')
        }
        else
        {
            card.classList.remove('lora-card')
        }
    })

}

function isStringInArray(array, searchString) {
    return array.some(function(item) {
        return item.toLowerCase() === searchString?.toLowerCase();
    });
}

let previousLoRAs = [];
let previousLoRAWeights = [];

function handleRefreshImageModifiers() {
    const loraModelData = loraModelField.value;
    let modelNames = loraModelData.modelNames;
    let modelWeights = loraModelData.modelWeights;

    const activeLoRAs = getLoRAFromActiveTags(activeTags, sharedCustomModifiers);
    let newModelNames = [];
    let newModelWeights = [];

    // Handle active LoRAs
    if (activeLoRAs && Array.isArray(activeLoRAs)) {
        for (let activeLoRA of activeLoRAs) {
            const newLoRAName = activeLoRA.loraname;
            const newLoRAWeight = activeLoRA.weight || 0.5;

            if (!isStringInArray(modelsCache.options.lora, newLoRAName)) {
                showToast(`LoRA not found: ${newLoRAName}`, 5000, true);
            }
            
            newModelNames.push(newLoRAName);
            newModelWeights.push(newLoRAWeight);
        }
    }

    // Handle inactive LoRAs
    for (let i = 0; i < modelNames.length; i++) {
        const currentLoRAName = modelNames[i];
        const currentLoRAWeight = modelWeights[i];
        
        if (!isLoRAInActiveTags(activeTags, sharedCustomModifiers, currentLoRAName)) {
            previousLoRAs.push(currentLoRAName);
            previousLoRAWeights.push(currentLoRAWeight);
            
            newModelNames.push(currentLoRAName);
            newModelWeights.push(currentLoRAWeight);
        }
    }

    loraModelField.value = {
        modelNames: newModelNames,
        modelWeights: newModelWeights
    };

    showLoRAs();
    return true;
}

showLoRAs()

// add the export and import links to the custom modifiers dialog
function initCustomModifiersDialog() {
    const imageModifierDialog = customModifiersTextBox.parentElement
    
    imageModifierDialog.insertAdjacentHTML('beforeend', `<p><small>Use the below links to export and import custom image modifiers.<br />
                                                        (if you have set any visuals, these will be saved/restored too)</small></p><p id="modifierBackupLinks">
                                                        <small><a id="exportModifiers">Export modifiers</a> - <a id="importModifiers">Import modifiers</a></small></p>`)

    // export link
    let downloadLink = document.getElementById("exportModifiers")
    downloadLink.addEventListener("click", function(event) {
        // export exactly what's shown in the textbox even if it hasn't been saved yet
        event.preventDefault()
        let inputCustomModifiers = customModifiersTextBox.value
        let tempModifiers = JSON.parse(JSON.stringify(sharedCustomModifiers)); // create a deep copy of sharedCustomModifiers
        inputCustomModifiers = inputCustomModifiers.replace(/^\s*$(?:\r\n?|\n)/gm, "") // remove empty lines
        if (inputCustomModifiers !== '') {
            inputCustomModifiers = importCustomModifiers(inputCustomModifiers)
            updateEntries(inputCustomModifiers, tempModifiers)
            downloadJSON(tempModifiers, "Image Modifiers.json")
        }
        else
        {
            downloadJSON(sharedCustomModifiers, "Image Modifiers.json")
        }
    })
                                  
    function downloadJSON(jsonData, fileName) {
        var file = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
        var fileUrl = URL.createObjectURL(file)
        var downloadLink = document.createElement("a")
        downloadLink.href = fileUrl
        downloadLink.download = fileName
        downloadLink.click()
        URL.revokeObjectURL(fileUrl)
    }
    
    // import link
    let input = document.createElement("input")
    input.style.display = "none"
    input.type = "file"
    document.body.appendChild(input)
    
    let fileSelector = document.querySelector("#importModifiers")        
    fileSelector.addEventListener("click", function(event) {
        event.preventDefault()
        input.click()
    })
    
    input.addEventListener("change", function(event) {
        let selectedFile = event.target.files[0]
        let reader = new FileReader()
        
        reader.onload = function(event) {
            sharedCustomModifiers = JSON.parse(event.target.result)
            // save the updated modifier list to persistent storage
            saveCustomCategories()
            // refresh the modifiers list
            customModifiersTextBox.value = exportCustomModifiers(sharedCustomModifiers)
            saveCustomModifiers()
            //loadModifierList()
            input.value = ''
        }
        reader.readAsText(selectedFile)
    })

    function filterImageModifierList() {
        let search = imageModifierFilter.value.toLowerCase();
        for (let category of document.querySelectorAll(".modifier-category")) {
          let categoryVisible = false;
          for (let card of category.querySelectorAll(".modifier-card")) {
            let label = card.querySelector(".modifier-card-label p").innerText.toLowerCase();
            if (label.indexOf(search) == -1) {
              card.classList.add("hide");
            } else {
              card.classList.remove("hide");
              categoryVisible = true;
            }
          }
          if (categoryVisible && search !== "") {
            openCollapsible(category);
            category.classList.remove("hide");
          } else {
            closeCollapsible(category);
            if (search !== "") {
                category.classList.add("hide");
            }
            else
            {
                category.classList.remove("hide");
            }
          }
        }
    }
    // Call debounce function on filterImageModifierList function with 200ms wait time
    //const debouncedFilterImageModifierList = debounce(filterImageModifierList, 200);
    const debouncedFilterImageModifierList = filterImageModifierList;

    // add the searchbox
    customModifierEntriesToolbar.insertAdjacentHTML('afterend', `<input type="text" id="image-modifier-filter" placeholder="Search for..." autocomplete="off"/>`)
    imageModifierFilter = document.getElementById("image-modifier-filter") // search box
    
    // Add the debounced function to the keyup event listener
    imageModifierFilter.addEventListener('keyup', debouncedFilterImageModifierList);

    // select the text on focus
    imageModifierFilter.addEventListener('focus', function(event) {
        imageModifierFilter.select()
    });

    // empty the searchbox on escape                
    imageModifierFilter.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (imageModifierFilter.value !== '') {
                imageModifierFilter.value = '';
                filterImageModifierList();
                event.stopPropagation();
            }
        }
    });

    // update the custom modifiers textbox's default string
    customModifiersTextBox.placeholder = 'Enter your custom modifiers, one-per-line. Start a line with # to create custom categories.'
}
initCustomModifiersDialog()

customModifiersTextBox.addEventListener("change", saveCustomModifiers)

/* RESTORE IMAGE MODIFIERS */
function saveImageModifiersState() {
    handleRefreshImageModifiers()
    localStorage.setItem('image_modifiers', JSON.stringify(activeTags))
    return true
}

// reload image modifiers at start
/*
document.addEventListener("loadImageModifiers", function(e) {
    let savedTags = JSON.parse(localStorage.getItem('image_modifiers'))
    savedTags = savedTags.filter(tag => tag !== null);
    let active_tags = savedTags == null ? [] : savedTags.map(x => x.name)

    // restore inactive tags in memory
    const inactiveTags = savedTags?.filter(tag => tag.inactive === true).map(x => x.name)
    
    // reload image modifiers
    refreshModifiersState(active_tags, inactiveTags)
         
    // update the active tags if needed
    updateActiveTags()
    
    return true
})
*/
function loadCustomImageModifierCards() {
    let savedTags = JSON.parse(localStorage.getItem('image_modifiers'))
    savedTags = savedTags.filter(tag => tag !== null);
    let active_tags = savedTags == null ? [] : savedTags.map(x => x.name)

    // restore inactive tags in memory
    const inactiveTags = savedTags?.filter(tag => tag.inactive === true).map(x => x.name)
    
    // reload image modifiers
    refreshModifiersState(active_tags, inactiveTags)
         
    // update the active tags if needed
    updateActiveTags()
    
    return true
}

function updateActiveTags() {
    activeTags.forEach((tag, index) => {
        if (tag.originElement) { // will be null if the custom tag was removed
            const modifierImage = tag.originElement.querySelector('img')
            let tinyModifierImage = tag.element.querySelector('img')
            if (modifierImage !== null) {
                if (tinyModifierImage === null) {
                    const tinyImageContainer = tag.element.querySelector('.modifier-card-image-container')
                    tinyImageContainer.insertAdjacentHTML('beforeend', `<img onerror="this.remove()" alt="Modifier Image" class="modifier-card-image">`)
                    tinyModifierImage = tag.element.querySelector('img')
                }
                tinyModifierImage.src = modifierImage.src
            }
        }
    })
}

/*
document.addEventListener("refreshImageModifiers", function(e) {
    // Get all div elements with class modifier-card-tiny
    const tinyCards = document.querySelectorAll('.modifier-card-tiny');
    
    // Remove class 'hide' from all the selected div elements
    tinyCards.forEach(card => {
      card.classList.remove('hide');
    });
    
    return true
})
*/

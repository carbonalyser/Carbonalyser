/**
 * Inject regions in the select region chooser.
 */
 injectRegionIntoHTML = (regions) => {
    const choice = document.getElementById("selectRegion");
    for(const name in regions) {
      const opt = document.createElement("option");
      opt.value = name;
      const translated = translate("region" + capitalizeFirstLetter(name));
      opt.text = (translated === '') ? name : translated;
      choice.add(opt);
    }
  }
  
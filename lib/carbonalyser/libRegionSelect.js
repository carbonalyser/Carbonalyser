/**
 * Inject regions in the select region chooser.
 */
 injectRegionIntoHTML = (regions, selectedRegion) => {
    const choice = document.getElementById("selectRegion");
    for(const name in regions) {
      const opt = document.createElement("option");
      opt.value = name;
      const translated = translate("region" + capitalizeFirstLetter(name));
      opt.text = (translated === '') ? name : translated;
      choice.add(opt);
    }
    if( selectedRegion !== '' && selectedRegion !== null ) {
        choice.value = selectedRegion;
    }
}  
# <p align="center">Carbonalyser</p>


|     <img src="https://user-images.githubusercontent.com/97546053/156412348-c4f6eafc-626b-4f62-8f33-c496f4d767d2.png" width="500px" />         |        <img src="https://user-images.githubusercontent.com/97546053/156412354-92ae4c36-8b3a-4744-82c9-8b73fbfa0a6a.png" width="500px" />         |
|--------------|-----------------|


Carbonalyser allows to visualize the electricity consumption and greenhouse gases (GHG) emissions that your Internet browsing leads to.<br />

Visualizing it will get you to understand that impacts of digital technologies on climate change and natural resources are not virtual, although they are hidden behind our screens.
<br />

| firefox  | firefox via github | chrome                |
|:----------:|:------------------------:|:-------------------------:|
| [<img alt="firefox" width="40px" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Firefox_logo.png/636px-Firefox_logo.png" />](https://addons.mozilla.org/fr/firefox/addon/carbonalyser/)     | [<img alt="firefox via github" width="40px" src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"/>](https://github.com/AAABBBCCCAAAA/Carbonalyser/releases) | dropped at the time |

<!-- [<img alt="chrome via github" src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Google_Chrome_icon_%282011%29.svg/512px-Google_Chrome_icon_%282011%29.svg.png" width="40px" />](https://github.com/AAABBBCCCAAAA/Carbonalyser/wiki/Install-for-chrome---without-chrome-webstore)  -->

## Features
- [x] browsing analysis history
- [x] preference screen
- [x] live update of carbon intensities
- [x] per site power efficiency
- [ ] maintaining power

## Privacy

None of your data are collected: all browsing data are analyzed directly on the user device and are not sent or processed anywhere else in any way.

The source code of this program is available in open access, to ensure transparency and for any other purpose. 

## Support

Documentation is on the [wiki](https://github.com/AAABBBCCCAAAA/Carbonalyser/wiki).

To report a bug, request a feature, check [here](https://github.com/AAABBBCCCAAAA/Carbonalyser/issues).

## Results & Related work

| where | description | type |
|:----------:|:------------------------:|:-----:|
|[wattime](https://www.watttime.org/)| warning displayed carbon intensities are displayed in percentage | carbon intensities scale |
|[GreenIT-Analysis](https://addons.mozilla.org/fr/firefox/addon/greenit-analysis/)| extension of devtools that provide comparator | site carbon emission comparator |
|[ecoindex](http://www.ecoindex.fr/)| | site carbon emission comparator |
|[carbon intensity](https://carbonintensity.org.uk/) | regionnalised carbon intensities for UK | carbon intensities |
|[edf](https://opendata.edf.fr/api/records/1.0/search/?dataset=indicateurs-de-performance-extra-financiere&q=&facet=annee&facet=engagements_rse&facet=csr_goals&facet=indicateurs_cles_de_performance&facet=performance_indicators&refine.indicateurs_cles_de_performance=Intensit%C3%A9+carbone%C2%A0%3A+%C3%A9missions+sp%C3%A9cifiques+de+CO2+dues+%C3%A0+la+production+d%E2%80%99%C3%A9lectricit%C3%A9+%E2%88%9A+(gCO2%2FkWh)) | specialized carbon intensity factor for france | carbon intensities |
|[electricity map](https://app.electricitymap.org/map) | by country carbon intensity factors | carbon intensities |

This carbon analyzer should be used as a website comparator (which one consume the more data) rather than an absolute measure of consummed electricity/data.<br />
For instance you can take [wikipedia](https://fr.wikipedia.org/wiki/Wikip%C3%A9dia:Accueil_principal) as the "green" site.

## Credits

Initial project:<br />
[Richard Hanna](https://twitter.com/richardhanna)<br />
[Gauthier Roussilhe](http://gauthierroussilhe.com)<br />
Maxime Efoui-Hess([The Shift Project](https://theshiftproject.org/en/home/))<br />
Assets:<br />
Refresh icons created by Dave Gandy - Flaticon<br />
Data sources:<br />
[carbonintensity](https://carbonintensity.org.uk/)
[edf](https://opendata.edf.fr/api/records/1.0/search/?dataset=indicateurs-de-performance-extra-financiere&q=&facet=annee&facet=engagements_rse&facet=csr_goals&facet=indicateurs_cles_de_performance&facet=performance_indicators&refine.indicateurs_cles_de_performance=Intensit%C3%A9+carbone%C2%A0%3A+%C3%A9missions+sp%C3%A9cifiques+de+CO2+dues+%C3%A0+la+production+d%E2%80%99%C3%A9lectricit%C3%A9+%E2%88%9A+(gCO2%2FkWh))

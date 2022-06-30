# <p align="center">Carbonalyser</p>
Carbonalyser allow you to analyse electricity consumption linked to your online activity as well as greenhouse gases emissions (in CO² equivalent). It analyse both the website and your browser.<br />
<br />
Greenhouse gases emissions are modeled as a linear model (the more you browse, the more you emit) plus per site weighting.<br />
The fact is not about how much near from reality parameters of the model are, but rather how much the model could explain the reality.<br />
Parameters such as carbon intensities could be maintained up to date with third party services but other cannot.<br />
<br />
<b>Do not keep default parameters of the model, they may be out of date</b>
<br />
With that information we produce the following representations to user:<br />
|     <img src="https://user-images.githubusercontent.com/97546053/176733414-6d79545c-f14e-4438-bfcd-d1d85fd298fc.png" width="500px" />         |        <img src="https://user-images.githubusercontent.com/97546053/176733126-b628e353-7f05-409f-a47f-1e8d322ed5d1.png" width="500px" />         |
|--------------|-----------------|

<!-- [<img alt="chrome via github" src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Google_Chrome_icon_%282011%29.svg/512px-Google_Chrome_icon_%282011%29.svg.png" width="40px" />](https://github.com/AAABBBCCCAAAA/Carbonalyser/wiki/Install-for-chrome---without-chrome-webstore)  -->

## Privacy

None of your data are collected: all browsing data are analyzed directly on the user device and are not sent or processed anywhere else in any way.<br />
However you can enable 3rd party services from preferences.<br />
For instances ecoindex in that case you should refer to them instead.<br />
The source code of this program is available in open access, to ensure transparency and for any other purpose. 

## Support

Documentation is on the [wiki](https://github.com/AAABBBCCCAAAA/Carbonalyser/wiki).<br />
To report a bug, request a feature, check [here](https://github.com/AAABBBCCCAAAA/Carbonalyser/issues).
#### Compatibility table
| firefox  | firefox via github | chrome                | firefox for android |
|:----------:|:------------------------:|:-------------------------:|:------------:|
| [<img alt="firefox" width="40px" src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Firefox_logo.png/636px-Firefox_logo.png" />](https://addons.mozilla.org/fr/firefox/addon/carbonalyser-fork/)     | [<img alt="firefox via github" width="40px" src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"/>](https://github.com/AAABBBCCCAAAA/Carbonalyser/releases) | dropped at the time | https://addons.mozilla.org/fr/firefox/collections/17360161/carbonalyser/ |
#### Provided features
- [x] browsing analysis history
- [x] preference screen
- [x] live update of carbon intensities
- [x] per site power efficiency
- [x] export the data
- [x] equivalence screen
- [x] solutions for consumers
- [x] forecast based on your current use
#### Languages
FR,ES,EN,DE

## Related work

| where | description | type |
|:----------:|:------------------------:|:-----:|
|[wattime](https://www.watttime.org/)| warning displayed carbon intensities are displayed in percentage | carbon intensities scale |
|[GreenIT-Analysis](https://addons.mozilla.org/fr/firefox/addon/greenit-analysis/)| extension of devtools that provide comparator | site carbon emission comparator |
|[ecoindex](http://www.ecoindex.fr/)| | site carbon emission comparator |
|[carbon intensity](https://carbonintensity.org.uk/) | regionnalised carbon intensities for UK | carbon intensities |
|[edf](https://opendata.edf.fr/api/records/1.0/search/?dataset=indicateurs-de-performance-extra-financiere&q=&facet=annee&facet=engagements_rse&facet=csr_goals&facet=indicateurs_cles_de_performance&facet=performance_indicators&refine.indicateurs_cles_de_performance=Intensit%C3%A9+carbone%C2%A0%3A+%C3%A9missions+sp%C3%A9cifiques+de+CO2+dues+%C3%A0+la+production+d%E2%80%99%C3%A9lectricit%C3%A9+%E2%88%9A+(gCO2%2FkWh)) | specialized carbon intensity factor for france | carbon intensities |
|[electricity map](https://app.electricitymap.org/map) | by country carbon intensity factors | carbon intensities |
|[PageSpeed Insights](https://pagespeed.web.dev/?hl=fr) | analysis of website from where does useless comes from |website analysis |
|[website carbon](https://www.websitecarbon.com/how-does-it-work/) | Website analysis with a method similar to the one used in carbon analyzer |site carbon emission comparator|

## Credits

Initial project:<br />
[Richard Hanna](https://twitter.com/richardhanna)<br />
[Gauthier Roussilhe](http://gauthierroussilhe.com)<br />
Maxime Efoui-Hess([The Shift Project](https://theshiftproject.org/en/home/))<br />
Assets:<br />
Refresh icons created by Dave Gandy - Flaticon<br />
bulb icon by [freepik](https://www.flaticon.com/fr/auteurs/freepik)<br />
Data sources:<br />
[carbonintensity](https://carbonintensity.org.uk/)
[edf](https://opendata.edf.fr/api/records/1.0/search/?dataset=indicateurs-de-performance-extra-financiere&q=&facet=annee&facet=engagements_rse&facet=csr_goals&facet=indicateurs_cles_de_performance&facet=performance_indicators&refine.indicateurs_cles_de_performance=Intensit%C3%A9+carbone%C2%A0%3A+%C3%A9missions+sp%C3%A9cifiques+de+CO2+dues+%C3%A0+la+production+d%E2%80%99%C3%A9lectricit%C3%A9+%E2%88%9A+(gCO2%2FkWh))<br />

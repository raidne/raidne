// ==UserScript==
// @name         Raidne
// @namespace    http://github.com/raidne
// @version      1.0
// @description  Cross-reference classifieds ads with review profiles.
// @match        http://*.backpage.com/*Escorts*
// @copyright    2013+, Team Raidne
// @require      https://raw.github.com/douglascrockford/JSON-js/master/json2.js
// @require      http://code.jquery.com/jquery-latest.js
// @require      http://jquery-json.googlecode.com/files/jquery.json-2.4.min.js
// ==/UserScript==

var TERURL_SEARCH = 'http://www.theeroticreview.com/reviews/newreviewsList.asp?searchreview=1&MP=&searchid=&searchByProviderID=&SortBy=10&Online=&ExcludeBadWebsite=&ExcludeBadPhone=&TotalReviews1=&TotalReviews2=&NewProvidersOnly=&OverallLooks1=&OverallLooks2=&OverallPerformance1=&OverallPerformance2=&OverallAverage1=&OverallAverage2=&ServiceType=&ServiceAddOn=&Price1=&Price2=&cs_config_country_field=countrySelect&cs_config_city_field=citySelect&cs_config_city2_field=city2Select&cs_config_country_default=countryDefault&cs_config_city_default=cityDefault&cs_config_city2_default=city2Default&cs_select_city_text=select+city&cs_select_country_text=selectCountry&cs_all_countries_text=All+Countries&cs_all_cities_text=All+Cities&countryDefault=&cityDefault=&city2Default=&searchFlDD=1&Name=&Country=&city=&location=&AreaCode=&Phone=${phone}&Typeofphoneservice=&Email=&svcEscort=&svcMassage=&svcSM=&Incall=&Outcall=&Daytime=&Nighttime=&tAgency=&Pornstar=&Sex=&Massage1=&Massage2=&SM=&BlowJob=&CuminMouth=&TouchPussy=&LickPussy=&Kiss=&Anal=&TwoGirlAction=&MorethanoneGuy=&NoRush=&MassageQuality1=&MassageQuality2=&SecondProvider=&MultiplePops=&Rimming=&picsreal=&PicsCurrent=&Build=&tHeight1=&tHeight2=&Age1=&Age2=&HairColor=&HairType=&HairLength1=&HairLength2=&BreastSize1=&BreastSize2=&BreastCup1=&BreastCup2=&BreastImplants=&BreastAppearance=&Piercings=&Tattoos=&Pussy=&Ethnicity=&Transsexual=&TFunctionality=&TVersatility=&TCockSize=&TCircumcised=&TEjaculates=&Smokes=&deliveredaspromised=&OnTime=';
var NUM_NAMES = {
    'zero': '0',
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9'
};
var ALT_CHARS = {
    'o': '0',
};

var URL_REVIEWS = {};
var URL_REVIEWS_PROCESSING = 0;
var URL_REVIEWS_READING = 1;
var URL_REVIEWS_UNKNOWN = 2;

function getPhoneRegex() {
    if (getPhoneRegex._phoneRegex !== null) {
        return getPhoneRegex._phoneRegex;
    }
    
    var chars = '';
    for (var altChar in ALT_CHARS) {
        chars += altChar;
    }
    
    var names = '';
    for (var numName in NUM_NAMES) {
        names += numName + '|';
    }
    
    names = names.substring(0, names.length - 1);
    //((?:(?:one|[0-9o])(?:(?:one|[^0-9]o)?)){10})
    getPhoneRegex._phoneRegex = new RegExp('((?:(?:'+names+'|[0-9'+chars+'])(?:(?:'+names+'|[^0-9'+chars+'])?)){10})');
    return getPhoneRegex._phoneRegex;
}

getPhoneRegex._phoneRegex = null;

function getHtml(url, onSuccess, onSuccessParameters) {
    jQuery.ajax(url, { 
        success: function(data, textStatus, jqXHR) {
            var params = [].concat(data).concat(onSuccessParameters);
            onSuccess.apply(null, params);
        }
    });
}

function findAdElement(adUrl) {
    var e = null;
    $('.cat a').each(function(index, element) {
       if (e !== null) {
           return;
       }
        
       var url = $(element).attr('href');
       if (adUrl === url) {
          e = $(element);
       }
    });
    
    return e;
}

function findAdContainer(adUrl) {
    var e = null;
    $('.cat').each(function(index, element) {
       if (e !== null) {
           return;
       }
        
        var a = $($(element).find('a')[0]);
        var url = a.attr('href');
        if (adUrl === url) {
           e = $(element);
        }
    });
    
    return e;
}

function initReference(ref, skipCreate) {
    if (typeof(skipCreate) === 'undefined') {
        var skipCreate = false;
    }
        
    if (ref.name !== null) {
        var a = findAdElement(ref.adUrl);
        a.after('<a style="color: red;" href="' + ref.reviewUrl + '"> [' + ref.name + '] </a>');
        URL_REVIEWS[ref.adUrl] = ref;
    }
    
    if (!skipCreate) {
        console.log('writing');
        jQuery.indexedDB('raidne').objectStore('reference', true).add(ref);
        console.log('wrote');
    }
}

function processReviews(html, adUrl) {
    var dom = $(jQuery.parseHTML(html));
    var a = $(dom.find('div.content-layout-area-reviews-newreviewslist table.bigtable td.col-primary a')[0]);
    var reviewUrl = 'http://www.theeroticreview.com' + a.attr('href');
    var name = a.text().trim();
    if (name === '') {
        return;
    }
    
    initReference({ adUrl: adUrl, reviewUrl: reviewUrl, name: name });
}

function parsePhone(str) {
    var phone = '';
    strLoop: for (var i = 0; i < str.length; ++i) {
        var parsed = parseInt(str[i]);
        if (!isNaN(parsed)) {
            phone += parsed;
            continue strLoop;
        }
        
        for (var j = i, substr = str[j]; j < str.length; ++j, substr += str[j]) {
            for (var numName in NUM_NAMES) {
                if (substr === numName) {
                    phone += NUM_NAMES[numName];
                    continue strLoop;
                }    
            }
        }
        
        for (var altChar in ALT_CHARS) {
            if (str[i] === altChar) {
                phone += ALT_CHARS[altChar];
                continue strLoop;
            }    
        }
    }
  
    if (phone.length !== 10) {
        throw 'Unable to parse phone number "' + str + '". Best guess: ' + phone;
    }
    
    return phone;
};

function processAd(html, adUrl) {
    var dom = $(jQuery.parseHTML(html));
    var post = $(dom.find('div.postingBody')[0]).text().trim().toLowerCase();
    var regex = getPhoneRegex();
    var phone = regex.exec(post)[0].trim();
    console.log(phone);
    phone = parsePhone(phone);
    console.log(phone);
    var reviewsUrl = TERURL_SEARCH.replace(/\$\{phone\}/g, phone);
    getHtml(reviewsUrl, processReviews, [adUrl]);
}

function processAds() {
    var dbFired = false;
    var adUrl = null;
    
    var urls = [];
    for (var url in URL_REVIEWS) {
        urls.push(url);
    }
    
    for (var i = 0; i < urls.length; ++i) {
        var url = urls[i];
        if (URL_REVIEWS[url] === null) {
            if (dbFired) {
                continue;
            }
            
            URL_REVIEWS[url] = URL_REVIEWS_READING;

            var onDone = new function(ref) {
                if (typeof(ref) === 'undefined') {
                    URL_REVIEWS[url] = URL_REVIEWS_UNKNOWN;
                } else {
                    initReference(ref, true);
                }
            };
            
            var onFail = new function() {
                URL_REVIEWS[url] = URL_REVIEWS_UNKNOWN;
            };
            
            $.indexedDB('raidne').objectStore('reference').get(url).then(onDone, onFail);
            dbFired = true;
        } else if (URL_REVIEWS[url] === URL_REVIEWS_UNKNOWN) {
            if (adUrl !== null) {
                continue;
            }
   
            adUrl = url;
            URL_REVIEWS[url] = URL_REVIEWS_PROCESSING; // mark as processing
            getHtml(adUrl, processAd, adUrl);
        } else if (URL_REVIEWS[url] === URL_REVIEWS_PROCESSING) {
            var ad = findAdContainer(url);
            if (ad !== null)
                ad.remove();
            
            URL_REVIEWS[url] = { adUrl: url, reviewUrl: null, name: null };
        }
    }
}

function initDb() {
    jQuery.indexedDB('raidne', {
        'version': 1,
        'schema': {
            '1': function(transaction) {
                transaction.createObjectStore('reference', { 'keyPath': 'adUrl' });
            }
        }
    });
}

function init(data) {
    eval(data);
    initDb();

    var adUrl;
    $('.cat a').each(function(index, element) {
        adUrl = $(element).attr('href');
        URL_REVIEWS[adUrl] = null;
    });

    setInterval(processAds, 3000);
}

jQuery.ajax('http://nparashuram.com/jquery-indexeddb/dist/jquery.indexeddb.js', {
    dataType: 'text',
    success: init
});


// ==UserScript==
// @name         alistWebLaunchExternalPlayer
// @version      1.0.6
// @description  alist Web Launc hExternal Player
// @description:zh-cn alistWeb 调用外部播放器, 注意自行更改 UI 中的包括/排除,或下面的 @match
// @description:en  alist Web Launch External Player
// @license      MIT
// @author       @Chen3861229 & aliang
// @github       https://github.com/bpking1/embyExternalUrl
// @match        */*
// <script src="https://fastly.jsdelivr.net/gh/imaliang/assets@master/js/alistWebLaunchExternalPlayer.js"></script>
// ==/UserScript==

(function () {
    'use strict';
    // 是否替换原始外部播放器
    const replaceOriginLinks = true;
    // 是否使用内置的 base64 图标
    const useInnerIcons = true;
    // 以下为内部使用变量,请勿更改
    let osType = "";
    async function init() {
        const playLinksWrapperEle = getShowEle();
        const linksEle = playLinksWrapperEle.getElementsByTagName("a");
        const oriLinkEle = linksEle[0];
        if (!oriLinkEle) {
            console.warn(`not have oriLinkEle, skip`);
            return;
        }

        const htmlTemplate = (id, imgSrc) =>
            `<a id="${id}" class="" href="" title="${id.replace("icon-", "")}"><img class="" src="${imgSrc}"></a>`;
        const iconBaseUrl = "https://fastly.jsdelivr.net/gh/bpking1/embyExternalUrl@main/embyWebAddExternalUrl/icons";
        const diffLinks = [
            { id: "icon-MPV", imgSrc: `${iconBaseUrl}/icon-MPV.webp` },
        ];
        const sameLinks = [
            { id: "icon-PotPlayer", imgSrc: `${iconBaseUrl}/icon-PotPlayer.webp` },
            { id: "icon-infuse", imgSrc: `${iconBaseUrl}/icon-infuse.webp` },
            { id: "icon-MXPlayer", imgSrc: `${iconBaseUrl}/icon-MXPlayer.webp` },
        ];
        const links = [...diffLinks, ...sameLinks];
        if (useInnerIcons) {
            // add icons from Base64, script inner, this script size 13.5KB to 64KB
            const iconsExt = getIconsExt();
            links.map(link => {
                const iconExt = iconsExt.find(icon => icon.id === link.id);
                if (!!iconExt) {
                    link.imgSrc = iconExt.url;
                }
            });
        }

        const insertLinks = (links, container) => {
            let htmlStr = links.map(link => htmlTemplate(link.id, link.imgSrc)).join("");
            container.insertAdjacentHTML("beforeend", htmlStr);
        };
        if (replaceOriginLinks) {
            playLinksWrapperEle.innerHTML = "";
            // sameLinks always before diffLinks
            insertLinks(links, playLinksWrapperEle);
        } else {
            insertLinks(diffLinks, playLinksWrapperEle);
        }
        playLinksWrapperEle.setAttribute("inited", "true");

        // fill original links properties
        for (let i = 0; i < linksEle.length; i++) {
            // a tag element
            linksEle[i].className = oriLinkEle.className;
            // img tag element
            const oriImgEle = oriLinkEle.children[0];
            if (!!oriImgEle) {
                linksEle[i].children[0].className = oriImgEle.className;
            } else {
                linksEle[i].children[0].style = "height: inherit";
            }
        }

        // get mediaInfo from original a tag href
        const streamUrl = decodeURIComponent(oriLinkEle.href.match(/\?(.*)$/)[1].replace("url=", ""));
        const urlObj = new URL(streamUrl);
        const filePath = decodeURIComponent(urlObj.pathname.substring(urlObj.pathname.indexOf("/d/") + 2));
        const fileName = filePath.replace(/.*[\\/]/, "");
        let subUrl = "";
        const token = localStorage.getItem("token");
        if (!!token) {
            const alistRes = await fetchAlistApi(`${urlObj.origin}/api/fs/get`, filePath, token);
            if (alistRes.related) {
                const subFileName = findSubFileName(alistRes.related);
                subUrl = !!subFileName
                    ? `${urlObj.protocol}//${urlObj.host}${encodeURIComponent(streamUrl.replace(alistRes.name, subFileName))}` : "";
            }
        } else {
            console.warn(`localStorage not have token, maybe is not this site owner, skip subtitles process`);
        }

        const mediaInfo = {
            title: fileName,
            streamUrl,
            subUrl,
            position: 0,
        }

        console.log(`mediaInfo:`, mediaInfo);
        osType = getOS();
        console.log(`getOS type: ${osType}`);

        // add link href
        const linkIdsMap = {
            // diff
            "icon-MPV": getMPVUrl,
            "icon-PotPlayer": getPotUrl,
            "icon-Infuse": getInfuseUrl,
            "icon-MXPlayer": getMXUrl,
        };
        for (let i = 0; i < linksEle.length; i++) {
            const id = linksEle[i].id;
            if (id && id in linkIdsMap) {
                linksEle[i].href = linkIdsMap[id](mediaInfo);
            }
        }
    }

    // copy from ./iconsExt, 如果更改了以下内容,请同步更改 ./iconsExt
    function getIconsExt() {
        return [
            {
                id: "icon-MPV", url: `
                data:image/webp;base64,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
            ` },
            {
                id: "icon-PotPlayer", url: `
                data:image/webp;base64,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
            ` },

            {
                id: "icon-MXPlayer", url: `
                data:image/webp;base64,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
            ` },
            {
                id: "icon-infuse", url: `
                data:image/webp;base64,UklGRjARAABXRUJQVlA4WAoAAAAQAAAA/wAA/wAAQUxQSM0GAAABGQVtJCk5pvVv+B4sRPQ/CERE7pDVPIn/zCd0BfAFOAIBgv9wEiIi8ZJuAkmb9c+//RETkJj//z8nSdLr9Y3I6bKr3aXMsW2ba9unPe0f4H9gb96TbdsY21MalKseOVnO+L4Pv8jLNyJ/3z3tRMQEEPdfpm4LGREOBBzIdppBgKhuSwJGBBG3chvIViGEooi6nQggIqCooCBDl1oYBhJIQorFIajbg0QFB3r4iYcefvDhg/v27dq584HpyrRYllpN3by/eff27Vvr69cvXLpw8fy9MikWh4BLT0ARdfrcFz91bfUQ2/13v+Nlq16lDBR0mUkUh09552ufyUjc+fhz3vAtr3vs+vWCzHVpGcVCefi7v56xufLEa157+PQtHCxrQSz6kh99LuP08MtOXPjKFi4ho1p8yU88wHgtT33i7JcJhKUrKJaHfu4oI/fE3v/ZSABcLqBlMnnHaxnBr33HZFKUJevgad+6n1G8/1ufNnDJWMrrn8doft7rS3GZOJisPokR/aTVycBlgbjrGCP72C6R5eG+hxndD+9zOTjAg4zwgzJ0wQwJX73OKL/+VRJwoUyB3LrASL9wKyAuEpLU84z28zVhoUWT04z404nqwhi1/su9MXfvX6qCi4JaPv1hRv2HP12URRUp/iEj/w8VdTFQfWh97K1fFFlMwVJ+ktG/dlvABTBafNGh8feUywrYHlIsP04HPn5hsIiqL1zpgWPnWEih6A/Qhfu/MrA1lPLQM/rg5PsJC6iFb6MPy+0NII0J6ts7gQf/Jwm2heoqvXjovxKaF31LN3D5aq1JU4L68n6Yvrcm2BKi06f2w6E/qTU0rj6Dflz5981ak6YUXtARfP7Ls7Ql6GpPXPzArIaGjcLJnrj7d7OaNISgx3pi5+/PZrUp0IP05IHDRZoWeaQreKwUbQnhSF8cVWnYiEf74qGi2A5GDvfFEUVaFo72xYMqLQvs64v9qg0ZZG9f7FOwHQR298UeVdp2R1/slMaFB/pih9pY2NkXO6EpiUz7YkXRduau9MWU1oVJX6yobdEdE5o2g9IXZY6tgEH7QkEa74xC84betDFDf9rW1/x//+///b///3/Q2hd1EdIXaS49krYIm32xSWi+OxoPpDcCaScM7/XFPYZpZf6dvrgzp+UkvZGkLeB2X9ym7YRkoy82EpJ2ILDeF+sQmk7SG0ljkMt9cTm0nSRX+uJKkjQUSC71xaUE0g5JcqUvriQJLSf5Ul98MQktx3DDAx1xg/0Y24khnD/eEWeOIaYdCHD6VEecPgFIwyHwhbWO+NwpEBuChI88ryM+dAql5UDy6VM7uuHOF44r2E5M4P7nntkNH19bAU07BBLe+7Ju+O+noLSdQP7xzd3wd6uCNkUSzpSTnXC6nkCl6ZCQf3xLJ/zN00SxpUAS/vjrp12w+SdrqDQeEi5/+rVd8C9PPYpia0N/+7u74NefFodtBZLko5sv6YD/na6q0nxSCb/2Yx3wi09Hii4ANXzkxvj7hwNrWGgvUJPw8y8Zey/5haejFhYwc6++bu+42/u65xx27iJQU2H6jnH3junToFhYgJjUJNO1p4+5p69NoxZNewRSa6bTl66Mt5WXTqdYiixoktTpZHJsvB2bTKYW1cUIoWYymUweHWuPTiaTSbEgi5qklkkpO4+MsyM7S5kUiy5MTFKGe/ePsf17y1w1i0JIVIusj691LM5nkcNA2Lg8ti5vgMPCQsUKDLj7lXH1lbsMAMwiEUUBUs/fH0/3z9cAKBoWO8xNaq3v/dRY+tR7a60JyzRJaq2n/2ZjDG38zelaa5IsDdVSJpNJmZRrx06Onn/6lZc8ryqlaFkSiFrmeufaQ4+Omvf92oEXHIpYigWXBSJatBS9/JXdT5SRMvu3352+6JkEi8WCWRoIDosqlz9259CBEXL2H/7yKS96ZkCLRTEsURFBReDWhz94rRycjoi7n3zfv9SXvvAQIBaLaliugqIASXL9w3//3rNX7u7Yt+2tnzt3+qNnVp//oieIoMUiyvIVmZ9Qh5sXP/bvf3ngocOHDx/at2f3jgd2rEynE4tLLTWzzc37d+7eubmxfu3q1asX6+OPH3/m2oQgOCyqWUJsFVJr6qzOhsX5CLJdBkLm7wNikBQpWkSWtXMgqbXW2WxztrlpsWwhuC0EskVNFWIKWLBQRLO0wHnUDGbz5iOC20AghMyvgIhbomHJSyBJTa2z2cz5bAEuucAWzAm4BaJsi0IgSeqsKioo83CphXkkkISgiIIatk9JSGpAREAAWf4BCBBCEAbI9pwgIFttmwMCBDGMR7eF8DX//x8zAFZQOCA8CgAAkD0AnQEqAAEAAT6RRpxKJaQioab1OmCwEgljbuFxMQxRm2p5LzvbJ/g/7L+xOc0P93BTpvMA/S79a+wh5gPOI9F3/S9Q7/q9Sn6AHSx/ujwf+WQzAXT61Pvbw7OUH+GMf0fnrJ/fD5kvqr2A+lF+zPsSloQo8jnqCIJBdqRZgeHOhuzWBSU1Yf7D0e2ep9u96EQsDl/lwABoR5HPT1azrXi4feSZlnEiAtA5gf9f4X4uyjvMEcYc1Ssl7S8kF8HN0g3S3ywzxqz1NigQU0V0vgmMCDnORu1G6O25oAhI8WhfrKe8weykfiXNg7GBAEOS9fT8AXEqMboQ0FKoxaJ6R0g60MQhxCQmFioL4ALavHFx50HZG/nTtSYxkPqLCdNiPdB9nSezTljqfgSClIxxw+IWC9cANJP2Hvx+cmFndr1x2CcPOGfpJLG6AielzoUhn/+fxGIBD8A2OPigE8yAhrP5q5EozSsCe39MR07uwzufVFIeskrLB3hQQlTrTOnGXu+LmqHL0Tb1eUo0VBcwIwQDiv1yIvSKBmxIqoDWuXhp6FDMnfpKvYhQcAmxwbf2zPLpOHCJSX+1W7mYR21HGgrDYby0QQKOxdicdpyWJePI2bUrhZMMEUIf38CL9JIfQuOjoS/X83bpbMRRpBdwhpBdwhkAAP7/KwADZpXN6BU6YpfpQLVBSDjLaVIjiIq/XdimiWqp/4O/chkuJn1AXVlzjEZeqY2DVKxd5xO7Pv60nSJMlr9mws9LOiKKSsRrBLEcM4kKdnFEkkpSd2ZZ41u/98u/1axd8IFZQXIT5Yycmx78tIwSJmz/+YMsjlnJwtEAMXaKo8xtV756tBA08P4LpxIA1M3sljIzmoRHfvQB78xgpniYn7iEyLIkbp7iU3YmIK8VerlkiL61K3mBTxvbNk53ShmxapDrYppCGFBJFnDhBfZoMwUcnGXXdhCe3AaLjVCwmP6euVMkESX6spGA+rvMolVZVNDYfWwRY9a9m79f+F1OP04TEG6PL+ADhmzUSRA089pcsExwbEU4vnmZT62E3E3XHUgG44O7OsSPWWyU5Cy0LabGFm3YlX/tXIBchZiEPn+jtoZCdFzal+kN5FFKg/yIPSlt+7Yg9AFFSie8Enwq7GgZ+XmTzx/mK2owQfSB1lHuoAfiDVy4nK6OKRyHnTTCc27jPGeoSOSMjsnI58sWIexkI+k7q99izPKJX5WV/bzg97Hofdc8hlcTJb+9jZKIuVDE0s8A3/K7WbB5vm+K6Gl/PeNt/J+hM7r5iYFNn+/kLpHsQtC1BDFd1ZoKVkFW1aDuaTv3aZUM9Wx0hREzujoOXE+RJf2MUGCQG/29b5CpyCV1ng9ldqFy1eA0GzfayvU/+3Gd78h6Vzg7vEYIcO8bVH4Qnlr469C2DIAZ8HyULKPPUkMFFpEFLY8H8rYvyXWMewb4PWJQlj82ALWXDASCHQFMhdvIqSh3EK4GW8zWsDmb6r01Yv2D1rG2dCRx5tJAPF0rjkYKS0JrXsCb92/f6olPvdmqJrjU+/yZHFmfex7SM9+P+CLlgCI8BkSnpGiEbqPfXnNpdiiPrG8RKsh+sLDycS7rqXiVRe836eBTn8X9STLkrvXQZAYBL3PTowyXou08n7htvMYFIA0r0QkOWphjoVrrXM/oR/tdPblHzwXb8KCYA8NjDfKddE2GS+L9LaSRPUTlvn0dCazYVbqkkyS8uctg/wNQ9aqtO54x/d+w+c4iFHYdNzD9J9SIzPVmuSCDxc8TfxRTZAk+43OK1wmAF7qfFhRY74ktIfaql3ai4cKh25g8h2pL8l0/i4PFPd3RxxBkvwH3hAPbo2l73U+LWEGpHOOT+AAT+AZNbyXm+Msxs49wc+UhIIN6JpKGFQMbZn41/GsfszgKUfuyRy1hFngtrovRpXdBXiGIlqEuKirthPHNi9ssJWbru2cZSAckCWOvB9ew/jbdn6v1/geiQywrerAKNfoGXFd8Ts8ZQb8s7qJ9hkv3bmKdO83BXo1k+qHG4D5DTjV8mpO89VaR05zV6Ty85Ojg6gWk8siJV7IUdLE4dOcn2eMIBArxiEP7joH5TNpaAHn6GqJRN5NHzkuWCho0sG3DdFoWWf9Azi5Ct5j11MduFvxmha05vd0OYvKC/M7bV4crN56XPSDsQYWVvoFAvD5YaifzFjjcN1DrRSkUAJMZJB2PJR0JnRqvw/L58K7svqFg6SlVSSd+8aEmWagQO++wlIwaU3s+tAhmypINjX0lcb6qYtDcyF34j5E30yvl0Qb/5TrG71gZuUIIBUH4rxr/klTYkdu8clEzjAczRWkIlskAkIv//EuGXAZ88DR7ztJN48zOh4BHIbOBWOTd3JNivW6xWUgy+jO2g7qzKlap4QW7aRqFVTENrZZJOCHNbyIuQb3jQOt7WrE1W5ZvbyjNxJOXG0HXhm2acr0HIg+a+RVNWejsvzeLeshtp+p5Wu2uEs6bF3ZryLa9JCM5wATrE1TkCKlLeFdD7Y1YagnGMzE70yYkzkJkxRClJ9GBNZAdCcz8xsuElHoq9anhfVDNIu1i1UThcf17K813ISB/QAdz2c6sMsWTLoC3Zh36MpQO8iqm8CqsRL6XaUy2MxKmlx4Ryy4BT3hfUEL7YrWEo6liS7TIEpDCuORi2fhTklLDE7x+ehaEzgeGoXJCr+g8sSusiee+M1n1hCjBswB7bw49UZsjZvGxsWQnzDtYPbMHroOgXEE7WlpdrlSCieT47fEI5kdcY+iOgrkYGtNhQmwHN8p3xQ96UMibm54OVi0YlJ5O9C7ejn77fXVO5fQ1pTSeq0j9OZXrdfvA4d4GQtLK1lEYuNOtIDy3cg2NLZIPMR6uVQCA7OkaButtSDlybD++Sq3SKOVUQ7XqONt88Maw236IdPK11PRNmfeGi39mcrmscsXTifuGucW4c/k9vwv3lg7osAGD8qmgIXYz4612QOlbJjVv9n8t33fRg3JGDAQT8bpkntjtunwtmfOmhMSMbspPw3lcB3+QTjOzQ6LRL2IOEUpCkLQbKG63UXHTmOLP1HfhlxVvlSXN2LGLcNyC2oZl6ixguKYK0GJBGX69fcmHdTakbv9ev6TL34OSXmVjNgS0YGTXk8GkLrN+BOcmsz2fb9ja2RAqSe2kfalxKJbIL91LP2V8ccmaKHH08DoIHnAdhH9AK6ildN3s+OiTaJ86xlK6T8oiKyjQnpb2Cv+kd/eUxwNjEYsBDfTwRDnVsW47lXA1ce7LgcdgtdjMQZX9PP9hKqVfjooXNC5k+apNPjrE+LJzH7ZyMFSUFlF9Y5FOlGEdOn4yIlASN0bb6ltDssDE70KAh+tHM+bfFGZ0a+a69tP8v7elmLF3paNoWOcWRsQf/TLC91z4oxPc0ljsbJAABnknRjZzPOdF+Ubl7JuVcC4IHjGVnQOmDetjW+VCVH/p47njhKFwQWF7MSok9Ox8aRYFbo44UrMQAAAAAA==
            ` },
        ];
    }

    function getShowEle() {
        return document.querySelector("div.obj-box .hope-flex"); // AList V3
    }

    async function fetchAlistApi(alistApiPath, alistFilePath, alistToken, ua) {
        const alistRequestBody = {
            path: alistFilePath,
            password: "",
        };
        try {
            const response = await fetch(alistApiPath, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json;charset=utf-8",
                    Authorization: alistToken,
                    "User-Agent": ua,
                },
                body: JSON.stringify(alistRequestBody),
            });
            if (!response.ok) {
                throw new Error(`fetchAlistApi response was not ok. Status: ${response.status}`);
            }
            const alistRes = await response.json();
            if (alistRes.error || alistRes.code !== 200) {
                throw new Error(`fetchAlistApi response had an error or non-200 status. Code: ${alistRes.code}`);
            }
            return alistRes.data;
        } catch (error) {
            console.error(`Error fetching API: ${error.message}`);
            throw error;
        }
    }

    function findSubFileName(related) {
        let subFileName = "";
        const subs = related.filter(o => o.type === 4);
        if (subs.length === 0) {
            console.log(`not have subs, skip`);
        } else {
            const cnSubs = subs.filter(o => o.name.match(/chs|sc|chi|cht|tc|zh/i));
            if (cnSubs.length === 0) {
                console.log(`not have cnSubs, will use first sub`);
                subFileName = subs[0].name;
            } else {
                console.log(`have cnSubs, will use first cnSub`);
                subFileName = cnSubs[0].name;
            }
        }
        return subFileName;
    }

    // URL with "intent" scheme 只支持
    // String => 'S'
    // Boolean =>'B'
    // Byte => 'b'
    // Character => 'c'
    // Double => 'd'
    // Float => 'f'
    // Integer => 'i'
    // Long => 'l'
    // Short => 's'

    function getPotUrl(mediaInfo) {
        return `potplayer://${encodeURI(mediaInfo.streamUrl)} /sub=${encodeURI(mediaInfo.subUrl)} /current /title="${mediaInfo.title}"}`;
    }

    // https://sites.google.com/site/mxvpen/api
    // https://mx.j2inter.com/api
    // https://support.mxplayer.in/support/solutions/folders/43000574903
    function getMXUrl(mediaInfo) {
        // mxPlayer free
        let mxUrl = `intent:${encodeURI(mediaInfo.streamUrl)}#Intent;package=com.mxtech.videoplayer.ad;S.title=${encodeURI(mediaInfo.title)};i.position=${mediaInfo.position};end`;
        // mxPlayer Pro
        // let mxUrl = `intent:${encodeURI(mediaInfo.streamUrl)}#Intent;package=com.mxtech.videoplayer.pro;S.title=${encodeURI(mediaInfo.title)};i.position=${mediaInfo.position};end`;
        return mxUrl;
    }

    function getInfuseUrl(mediaInfo) {
        // sub 参数限制: 播放带有外挂字幕的单个视频文件（Infuse 7.6.2 及以上版本）
        // see: https://support.firecore.com/hc/zh-cn/articles/215090997
        return `infuse://x-callback-url/play?url=${encodeURIComponent(mediaInfo.streamUrl)}&sub=${encodeURIComponent(mediaInfo.subUrl)}`;
    }

    // MPV

    function getMPVUrl(mediaInfo) {
        let MPVUrl = `mpv://${mediaInfo.streamUrl};${mediaInfo.title};1;1`;
        if (mediaInfo.subUrl.length > 0) {
            MPVUrl = MPVUrl + `;${mediaInfo.subUrl}`;
        } else {
            MPVUrl = MPVUrl + `;0`;
        }

        if (osType == "ios" || osType == "android") {
            MPVUrl = `mpv://${encodeURI(mediaInfo.streamUrl)}`;
        }
        return MPVUrl;
    }

    function getMPVUrl2(mediaInfo) {
        //桌面端需要额外设置,使用这个项目: https://github.com/akiirui/mpv-handler
        let streamUrl64 = btoa(encodeURIComponent(mediaInfo.streamUrl))
            .replace(/\//g, "_").replace(/\+/g, "-").replace(/\=/g, "");
        let MPVUrl = `mpv://play/${streamUrl64}`;
        if (mediaInfo.subUrl.length > 0) {
            let subUrl64 = btoa(mediaInfo.subUrl).replace(/\//g, "_").replace(/\+/g, "-").replace(/\=/g, "");
            MPVUrl = `mpv://play/${streamUrl64}/?subfile=${subUrl64}`;
        }

        if (osType == "ios" || osType == "android") {
            MPVUrl = `mpv://${encodeURI(mediaInfo.streamUrl)}`;
        }
        return MPVUrl;
    }

    function getOS() {
        let ua = navigator.userAgent
        if (!!ua.match(/compatible/i) || ua.match(/Windows/i)) {
            return 'windows'
        } else if (!!ua.match(/Macintosh/i) || ua.match(/MacIntel/i)) {
            return 'macOS'
        } else if (!!ua.match(/iphone/i) || ua.match(/Ipad/i)) {
            return 'ios'
        } else if (ua.match(/android/i)) {
            return 'android'
        } else if (ua.match(/Ubuntu/i)) {
            return 'ubuntu'
        } else {
            return 'other'
        }
    }

    // emby/jellyfin CustomEvent
    // see: https://github.com/MediaBrowser/emby-web-defaultskin/blob/822273018b82a4c63c2df7618020fb837656868d/nowplaying/videoosd.js#L691
    // monitor dom changements
    const domChangeObserver = new MutationObserver((mutationsList) => {
        console.log("Detected DOM change (Child List)");
        const showElement = getShowEle();
        if (showElement && showElement.getAttribute("inited") !== "true") {
            init();
            // 切换链接类型依赖监视器
            // domChangeObserver.disconnect();
        }
    });
    window.addEventListener("load", () => {
        domChangeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    });

    // window.addEventListener("popstate", function() {
    //     console.log("Detected page navigation (forward or back button)");
    //     mutation.observe(document.body, {
    //         childList: true,
    //         subtree: true
    //     });
    // });

})();

define([
  '../BaseAppView.js',
  "../../scripts/constants/window-names.js",
  "../../scripts/services/windows-service.js",
], function (BaseAppView, WindowNames, WindowsService) {

  class CharactersView extends BaseAppView {
    constructor(controller) {
      super();

      this._controller = controller;

      this._mainWindow = overwolf.windows.getMainWindow();
      
      this._selectedVersion = this._mainWindow.storage.version();
      this._selectedLanguage = this._mainWindow.lang.language();

      document.getElementById('user-characters').addEventListener('click', this.loadUserCharacterByTarget.bind(this));
      this._recentCharacters = document.getElementById('recent-characters');
      this._recentCharacters.addEventListener('click', this.loadRecentCharacterByTarget.bind(this));
      
      document.getElementById('rankings-tab').addEventListener('click', this.rankingsClicked.bind(this));
      document.getElementById('gear-tab').addEventListener('click', this.gearClicked.bind(this));
      document.getElementById('raids-tab').addEventListener('click', this.raidsClicked.bind(this));
      document.getElementById('dungeons-tab').addEventListener('click', this.dungeonsClicked.bind(this));
      
      document.getElementById('search-form').setAttribute('action', this._mainWindow.game.origin() + '/search?type=characters')

      this._groupApplicants = document.getElementById('group-applicants');
      this._groupApplicantsBadge = document.getElementById('group-applicants-badge');
      this._groupApplicantsBadgeContents = document.getElementById('group-applicants-badge-contents');
      this._groupApplicantsContents = document.getElementById('group-applicants-contents');
      this._groupApplicantsContents.addEventListener('click', this.loadRecentCharacterByTarget.bind(this));
      this._groupApplicantsInfo = document.getElementById('group-applicants-info');
      this._groupApplicantsInfo.addEventListener('click', this.selectRegionByTarget.bind(this));
      this._groupApplicantsRaidTypeOptions = document.getElementById('group-applicants-raid-type-options');
      this._groupApplicantsSortOptions = document.getElementById('group-applicants-sort-options');
      if (!this._mainWindow.game.showGroupApplicantSortOptions())
        document.getElementById('group-applicants-settings').style.display = 'none';
    }

    onLoginSuccessful(user) {
      document.getElementById('user-characters').innerHTML = this._mainWindow._controller.buildCharacterListFromJSON();
      this._mainWindow.loadRecentCharacters();
    }

    loggedOut() {
      document.getElementById('user-characters').innerHTML = '';
    }

    loadUserCharacterByTarget(event) {
      let node = event.target
      let charAttr = node.getAttribute("characterid")
      while (charAttr === null && node) {
        node = node.parentNode
        if (!node)
          break
          charAttr = node.getAttribute("characterid")
      }
      if (charAttr !== null) {
        this._controller.loadCharacterById(charAttr)
      }
    }

    loadRecentCharacterByTarget(event) {
      let node = event.target
      let charAttr = node.getAttribute("linkid")
      while (charAttr === null && node) {
        node = node.parentNode
        if (!node)
          break
          charAttr = node.getAttribute("linkid")
      }
      if (charAttr !== null) {
        this._controller.loadCharacter(charAttr)
      }
    }

    charactersUpdated(data) {
      let characters = data.characters.sort((a,b) => { return ('' + a.name).localeCompare(b.name) });
      if (!characters || !characters.length) {
        this._recentCharacters.style.display = 'none';
        return;
      }
      this._recentCharacters.style.display = 'flex';

      let charResult = '';

      for (let i = 0; i < characters.length; ++i) {
        let character = characters[i];
        charResult += '<div id="recent-character" class="';
        charResult += character.className + '" linkid="' 
         let link =  mainWindow.game.origin() + '/character/' 
                   + data.region + '/' + (character.slug ? character.slug : character.server)
                   + '/' + character.name ;

        charResult += link + '">'
        charResult += character.name + '</div>';
      }
      document.getElementById('recent-characters-contents').innerHTML = charResult;
    }

    getUniqueIdForGroupApplicant(groupApplicant) {
      return `${groupApplicant.playerName}-${groupApplicant.serverSlug}-${groupApplicant.regionName}`;
    }

    clearApplicantBadgeCount()
    {
      this._groupApplicantsBadgeContents.innerText = '';
      this._groupApplicantsBadge.style.display = 'none';
    }

    groupApplicantsUpdated(groupApplicants, badgeCount) {
      if (badgeCount !== undefined)
        mainWindow.clearGroupApplicantBadgeCount();

      if (groupApplicants.length === 0) {
        console.log("No applicants!")
        this._groupApplicants.style.display = 'none';
        return;
      }

      const raidType = this._controller.raidType;
      const sortMetric = this._mainWindow.getGroupFinderSortMetric();
      if (sortMetric === 'itemLevel') {
        groupApplicants = groupApplicants.sort((x, y) => y.itemLevel - x.itemLevel);
      }
      if (sortMetric === 'score') {
        let selector = groupApplicant => groupApplicant.extraData?.scores?.[0]?.allStars?.score ?? 0;
        if (this._mainWindow.game.prefix() === 'warcraft') {
          if (raidType === 'raids') {
            selector = groupApplicant => {
              const raidZone = groupApplicant.extraData?.scores?.find(x => x.zone.id !== 25);
              return (raidZone?.progress?.difficulty ?? 0) * 100000000 +
                     (raidZone?.zone?.id ?? 0) * 100000 +
                     (raidZone?.progress?.killed ?? 0) * 10000 +
                     (raidZone?.allStars?.score ?? 0);
            };
          } else {
            selector = groupApplicant => groupApplicant.extraData?.scores?.find(x => x.zone.id === 25)?.allStars?.score ?? 0;
          }
        }
        groupApplicants = groupApplicants.sort((x, y) => selector(y) - selector(x));
      }

      if (badgeCount !== undefined)
        this._groupApplicantsBadge.style.display = 'none';
      else
        this._groupApplicantsBadge.style.display = 'block';
      this._groupApplicantsBadgeContents.innerText =  groupApplicants.length;
 
      this._groupApplicantsContents.innerHTML = groupApplicants.map(applicant => `
        <div class="group-applicants-entry"
             data-id="${this.getUniqueIdForGroupApplicant(applicant)}"
             linkid="${this._mainWindow.game.origin()}/character/${applicant.regionName}/${applicant.serverSlug}/${applicant.playerName}">
          <div class="group-applicants-character">
            <div class="group-applicants-character-icon">
              <img src="${this._mainWindow.game.fallbackIconForGroupApplicant()}" />
              <div class="badge-label">
                ${applicant.itemLevel??''}
              </div>
            </div>
            <div class="group-applicants-character-name-and-server">
              <div class="group-applicants-character-name">
                ${applicant.roleNames.map(roleName => `
                  <img class="group-applicants-role-icon"
                       src="../../img/${this._mainWindow.game.prefix()}/roles/${roleName}.png"
                       alt="${roleName}" />
                `).join('')}
                <div class="${applicant.className}">
                  ${applicant.playerName}
                </div>
              </div>
              <div class="group-applicants-character-server">
                ${applicant.serverName}${applicant.regionName === 'all' ? '' : ` (${applicant.regionName})`}
              </div>
            </div>
          </div>
          <div class="group-applicants-score"></div>
        </div>
      `).join('');

      groupApplicants.forEach(groupApplicant => this.enrichGroupApplicant(groupApplicant));

      if (this._mainWindow.game.prefix() === 'warcraft') {
        this._groupApplicantsRaidTypeOptions.innerHTML = `
          <div class="character-tab raid-type-tab ${raidType === 'raids' ? 'selected' : ''}" data-raid-type="raids">
            ${this._mainWindow.lang.trans('raids')}
          </div>
          <div class="character-tab raid-type-tab ${raidType === 'dungeons' ? 'selected' : ''}" data-raid-type="dungeons">
            ${this._mainWindow.lang.trans('mythic_plus_dungeons')}
          </div>`

        $(this._groupApplicantsRaidTypeOptions)
          .find('.raid-type-tab')
          .on('click', (event) => {
            const raidType = event.target.dataset.raidType;

            if (raidType === 'raids')
              this.raidsClicked(event);
            else
              this.dungeonsClicked(event);
          });
      }

      this._groupApplicantsSortOptions.innerHTML = `
        <span>${this._mainWindow.lang.trans('sort_by')}</span>
        <div class="group-applicants-sort-options-choices">
          <div class="character-tab" data-sort-metric="applicationTime">
            ${this._mainWindow.lang.trans('application_time')}
          </div>
          <div class="character-tab" data-sort-metric="score">
            ${this._mainWindow.lang.trans('score')}
          </div>
          <div class="character-tab" data-sort-metric="itemLevel">
            ${this._mainWindow.lang.trans('item_level')}
          </div>
        </div>
      `;
      $(`[data-sort-metric="${sortMetric}"]`).addClass('selected');
      $('[data-sort-metric]').on('click', event => {
        const sortMetric = event.target.dataset.sortMetric;
        this._mainWindow.setGroupFinderSortMetric(sortMetric);
        this._mainWindow.onInfoUpdate(this._mainWindow._latestInfoUpdate);
      });

      const regions = this._mainWindow.game.regions();
      if (regions) {
        const selectedRegionName = regions.find(x => x.id === this._mainWindow.getRegion()).name;
        this._groupApplicantsInfo.innerHTML = `
          <div id="group-applicants-info-region-menu-container">
            <ul id="group-applicants-info-region-menu" class="sm sm-black">
              <div>
                <li id="regions">
                  <a>
                    <span id="regions-selection-text">
                      ${selectedRegionName}
                    </span>
                  </a>
                  <ul>
                    ${regions.map(region => `
                      <a href="#"
                         id="region-${region.id}"
                         regionid="${region.id}">
                        ${region.name}
                      </a>
                    `).join('')}
                  </ul>
                </li>
              </div>
            </ul>
          </div>
          <div class="group-applicants-info-text">
            ${this._mainWindow.lang.trans('character_lookup_uses_preferred_region')}
          </div>
        `;
        $('#group-applicants-info-region-menu').smartmenus({
          showOnClick: true,
          mainMenuSubOffsetX: -1,
          subMenusSubOffsetX: 10,
          subMenusSubOffsetY: 0,
          subMenusMaxWidth: '400px'
        });
        this._groupApplicantsInfo.style.display = 'grid';
      } else {
        this._groupApplicantsInfo.style.display = 'none';
      }

      this._groupApplicants.style.display = 'block';
    }

    enrichGroupApplicant(groupApplicant) {
      const extraData = groupApplicant.extraData;

      if (!extraData)
        return;

      const id = this.getUniqueIdForGroupApplicant(groupApplicant);

      if (extraData.character.iconUrl) {
        document.querySelector(`[data-id="${id}"] .group-applicants-character-icon img`).src = extraData.character.iconUrl;
      }

      const buildScoreZoneAndValueElement = (scoresForZone, raidType) => {
        let zoneTitle = scoresForZone.zone.name;
        if (raidType === 'raids') {
          const difficultyName = scoresForZone.allStars?.difficulty?.name;
          if (difficultyName)
            zoneTitle += ` (${difficultyName})`;
        }
        if (raidType === 'dungeons') {
          zoneTitle = scoresForZone.allStars?.partition?.name ?? scoresForZone.zone.name;
        }

        return $(`
          <div class="group-applicants-score-contents ${raidType === this._controller.raidType ? 'selected' : ''}"
               data-raid-type="${raidType}">
            <div class="group-applicants-score-zone-and-value">
              <div class="group-applicants-score-zone">
                ${zoneTitle}
              </div>
              <div class="group-applicants-score-value">
                <span class="group-applicants-score-value-points ${scoresForZone.allStars?.cssClass ?? ''}">
                  ${Math.ceil(scoresForZone.allStars?.score ?? 0)}
                </span>
                <span class="group-applicants-score-value-spec">
                  ${scoresForZone.allStars?.spec?.name ? `(${scoresForZone.allStars?.spec?.name})` : ''}
                </span>
                ${extraData.character.covenant?.id ? `<img class="group-applicants-character-covenant-icon" src="${extraData.character.covenant.iconUrl}" />` : ''}
              </div>
            </div>
            <div class="group-applicants-score-icon">
              <img src="${scoresForZone.zone.iconUrl}" />
              ${scoresForZone.progress ? `
              <div class="group-applicants-score-progress">
                ${scoresForZone.progress.killed}/${scoresForZone.progress.possible}
              </div>
              ` : ''}
            </div>
          </div>
        `);
      };

      const applicantScoreElement = $(`[data-id="${id}"] .group-applicants-score`);
      applicantScoreElement.empty();

      if (this._mainWindow.game.prefix() === 'warcraft') {
        const raidScores = extraData.scores.find(x => x.zone.id !== 25);
        if (raidScores) {
          applicantScoreElement.append(buildScoreZoneAndValueElement(raidScores, 'raids'))
        }
        const dungeonScores = extraData.scores.find(x => x.zone.id === 25);
        if (dungeonScores) {
          applicantScoreElement.append(buildScoreZoneAndValueElement(dungeonScores, 'dungeons'))
        }
      } else {
        const scores = extraData.scores[0];
        if (scores) {
          applicantScoreElement.append(buildScoreZoneAndValueElement(scores, this._controller.raidType))
        }
      }
    }

    selectRegionByTarget(event) {
      let node = event.target
      let regionAttr = node.getAttribute('regionid')

      while (regionAttr === null && node) {
        node = node.parentNode
        if (!node)
          break;

        regionAttr = node.getAttribute('regionid')
      }

      if (regionAttr !== null)
        this.selectRegion(parseInt(regionAttr));
    }

    selectRegion(regionID) {
        this._mainWindow.setRegion(regionID);
        this._mainWindow.onInfoUpdate(this._mainWindow._latestInfoUpdate);
    }
    
    rankingsClicked(evt)
    {
      $("#rankings-tab").addClass("selected");
      $("#gear-tab").removeClass("selected");
      this._controller.displayMode = "rankings";
      if (this._controller.currentCharacter)
        this._controller.loadCharacter(this._controller.currentCharacter);
      let mainWindow = overwolf.windows.getMainWindow();
      mainWindow.storage.setVersionedStoredItem("characterDisplayMode", "rankings");
    }

    gearClicked(evt)
    {
      $("#gear-tab").addClass("selected");
      $("#rankings-tab").removeClass("selected");
      this._controller.displayMode = "gear";
      if (this._controller.currentCharacter)
        this._controller.loadCharacter(this._controller.currentCharacter);
      let mainWindow = overwolf.windows.getMainWindow();
      mainWindow.storage.setVersionedStoredItem("characterDisplayMode", "gear");
    }

    raidsClicked(evt)
    {
      $("[data-raid-type='raids']").addClass("selected");
      $("[data-raid-type='dungeons']").removeClass("selected");
      this._controller.raidType = "raids";
      if (this._controller.currentCharacter)
        this._controller.loadCharacter(this._controller.currentCharacter);
      let mainWindow = overwolf.windows.getMainWindow();
      mainWindow.storage.setVersionedStoredItem("characterRaidType", "raids");
      this._mainWindow.onInfoUpdate(this._mainWindow._latestInfoUpdate);
    }

    dungeonsClicked(evt)
    {
      $("[data-raid-type='raids']").removeClass("selected");
      $("[data-raid-type='dungeons']").addClass("selected");
      this._controller.raidType = "dungeons";
      if (this._controller.currentCharacter)
        this._controller.loadCharacter(this._controller.currentCharacter);
      let mainWindow = overwolf.windows.getMainWindow();
      mainWindow.storage.setVersionedStoredItem("characterRaidType", "dungeons");
      this._mainWindow.onInfoUpdate(this._mainWindow._latestInfoUpdate);
    }
  };

  return CharactersView;
});
import { getBotDisplayName, newBot, newEndpoint } from '@bfemulator/app-shared';
import { IBotConfig } from '@bfemulator/sdk-shared';
import { hasNonGlobalTabs } from '../../data/editorHelpers';
import { CommandService } from '../../platform/commands/commandService';
import { getActiveBot } from '../../data/botHelpers';
import store from '../../data/store';
import * as BotActions from '../../data/action/botActions';
import * as FileActions from '../../data/action/fileActions';
import * as NavBarActions from '../../data/action/navBarActions';
import * as EditorActions from '../../data/action/editorActions';
import * as ExplorerActions from '../../data/action/explorerActions';
import * as Constants from '../../constants';

export const ActiveBotHelper = new class {

  confirmSwitchBot(): Promise<any> {
    const hasTabs = hasNonGlobalTabs();
    if (hasTabs) {
      return CommandService.remoteCall('shell:show-message-box', true, {
        type: 'question',
        buttons: ["Cancel", "OK"],
        defaultId: 1,
        message: "Switch bots? All tabs will be closed.",
        cancelId: 0,
      });
    } else {
      return Promise.resolve(true);
    }
  }

  confirmCloseBot(): Promise<any> {
    const hasTabs = hasNonGlobalTabs();
    if (hasTabs) {
      return CommandService.remoteCall('shell:show-message-box', true, {
        type: 'question',
        buttons: ["Cancel", "OK"],
        defaultId: 1,
        message: "Close active bot? All tabs will be closed.",
        cancelId: 0,
      });
    } else {
      return Promise.resolve(true);
    }
  }
  /** Uses a .bot path and perform a read on the server-side to populate the corresponding bot object */
  setActiveBot(botPath: string): Promise<any> {
    return CommandService.remoteCall('bot:set-active', botPath)
      .then(({ bot, botDirectory }: { bot: IBotConfig, botDirectory: string }) => {
        store.dispatch(BotActions.setActive(bot, botDirectory));
        store.dispatch(FileActions.setRoot(botDirectory));
        CommandService.remoteCall('menu:update-recent-bots');
        CommandService.remoteCall('electron:set-title-bar', getBotDisplayName(bot));
      })
      .catch(err => {
        console.error('Error while setting active bot: ', err);
        throw new Error(`Error while setting active bot: ${err}`);
      });
  }

  /** tell the server-side the active bot is now closed */
  closeActiveBot(): Promise<any> {
    return CommandService.remoteCall('bot:close')
    .then(() => {
      store.dispatch(BotActions.close());
      CommandService.remoteCall('electron:set-title-bar', '');
    } )
      .catch(err => {
        console.error('Error while closing active bot: ', err);
        throw new Error(`Error while closing active bot: ${err}`);
      });
  }

  // TODO: cleanup nested promises
  confirmAndCreateBot(botToCreate: IBotConfig, botDirectory: string, secret: string): Promise<any> {
    return this.confirmSwitchBot()
      .then((result) => {
        if (result) {
          store.dispatch(EditorActions.closeNonGlobalTabs());
          CommandService.remoteCall('bot:create', botToCreate, botDirectory, secret)
            .then((bot: IBotConfig ) => {
              console.log(bot, bot.path);
              store.dispatch((dispatch) => {
                store.dispatch(BotActions.create(bot, bot.path, secret));
                this.setActiveBot(bot.path)
                  .then(() => {
                    CommandService.call('livechat:new');
                    store.dispatch(NavBarActions.select(Constants.NavBar_Files));
                    store.dispatch(ExplorerActions.show(true));
                  })
              });
            })
            .catch(err => console.error('Error during bot create: ', err));
        }
      });
  }

  browseForBotFile(): Promise<any> {
    const dialogOptions = {
      title: 'Open bot file',
      buttonLabel: 'Choose file',
      properties: ['openFile'],
      filters: [
        {
          name: "Bot Files",
          extensions: ['bot']
        }
      ],
    };
    return CommandService.remoteCall('shell:showOpenDialog', dialogOptions);
  }

  confirmAndOpenBotFromFile(): Promise<any> {
    return this.browseForBotFile()
      .then(filename => {
        this.confirmSwitchBot()
          .then(result => {
            if (result) {
              store.dispatch(EditorActions.closeNonGlobalTabs());
              CommandService.remoteCall('bot:load', filename);
            }
          })
          .catch(() => console.log("canceled confirmSwitchBot"))
      })
      .catch(() => console.log("canceled browseForBotFile"));
  }

  confirmAndSwitchBots(botPath: string): Promise<any> {
    let activeBot = getActiveBot();
    if (activeBot && activeBot.path === botPath)
      return Promise.resolve();

    console.log(`Switching to bot ${botPath}`);

    return this.confirmSwitchBot()
      .then((result) => {
        if (result) {
          store.dispatch(EditorActions.closeNonGlobalTabs());
          this.setActiveBot(botPath)
            .then(() => {
              CommandService.call('livechat:new');
              store.dispatch(NavBarActions.select(Constants.NavBar_Files));
              store.dispatch(ExplorerActions.show(true));
            })
            .catch(err => new Error(err));
        }
      })
      .catch(err => console.error('Error while setting active bot: ', err));
  }

  confirmAndCloseBot(): Promise<any> {
    let activeBot = getActiveBot();
    if (!activeBot)
      return Promise.resolve();

    console.log(`Closing active bot`);

    return this.confirmCloseBot()
      .then((result) => {
        if (result) {
          store.dispatch(EditorActions.closeNonGlobalTabs());
          this.closeActiveBot()
            .catch(err => new Error(err));
        }
      })
      .catch(err => console.error('Error while closing active bot: ', err));
  }

}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { setSiteOS } from '../../../tree/subscriptionTree/SubscriptionTreeItem';
import { ContainerAppsStep } from './Containers/ContainerAppsStep';
import type { ContainerApp } from '@azure/arm-appcontainers';
import type { IAppServiceWizardContext } from '@microsoft/vscode-azext-azureappservice';
import { AppServicePlanListStep } from '@microsoft/vscode-azext-azureappservice';
import {
  StorageAccountListStep,
  StorageAccountKind,
  StorageAccountPerformance,
  StorageAccountReplication,
  type INewStorageAccountDefaults,
} from '@microsoft/vscode-azext-azureutils';
import { AzureWizardPromptStep, type IAzureQuickPickItem, type IWizardOptions } from '@microsoft/vscode-azext-utils';

export interface AppServiceWizardContext extends IAppServiceWizardContext {
  suppressCreate: boolean;
  useContainerApps: boolean;
  containerApp?: ContainerApp;
}

export class LogicAppHostingPlanStep extends AzureWizardPromptStep<AppServiceWizardContext> {
  public async prompt(wizardContext: AppServiceWizardContext): Promise<void> {
    const placeHolder: string = localize('selectHostingPlan', 'Select a hosting plan.');
    const picks: IAzureQuickPickItem<[boolean, boolean, RegExp | undefined, boolean]>[] = [
      { label: localize('workflowstandard', 'Workflow Standard'), data: [false, false, /^WS$/i, false] },
      { label: localize('dedicated', 'App Service Plan'), data: [false, true, /^IV2$/i, false] },
      { label: localize('container apps', 'Container Apps Environment'), data: [false, true, /^IV2$/i, true] },
    ];

    [wizardContext.useConsumptionPlan, wizardContext.suppressCreate, wizardContext.planSkuFamilyFilter, wizardContext.useContainerApps] = (
      await wizardContext.ui.showQuickPick(picks, { placeHolder })
    ).data;

    setSiteOS(wizardContext);
  }

  public shouldPrompt(wizardContext: AppServiceWizardContext): boolean {
    return !wizardContext.customLocation && wizardContext.useConsumptionPlan === undefined;
  }

  public async getSubWizard(wizardContext: AppServiceWizardContext): Promise<IWizardOptions<AppServiceWizardContext> | undefined> {
    const { suppressCreate, useConsumptionPlan, useContainerApps } = wizardContext;

    if (useContainerApps) {
      const storageAccountCreateOptions: INewStorageAccountDefaults = {
        kind: StorageAccountKind.Storage,
        performance: StorageAccountPerformance.Standard,
        replication: StorageAccountReplication.LRS,
      };
      return {
        promptSteps: [
          new ContainerAppsStep(),
          new StorageAccountListStep(storageAccountCreateOptions, {
            kind: [StorageAccountKind.BlobStorage],
            performance: [StorageAccountPerformance.Premium],
            replication: [StorageAccountReplication.ZRS],
            learnMoreLink: 'https://aka.ms/Cfqnrc',
          }),
        ],
      };
    } else if (!useConsumptionPlan) {
      return { promptSteps: [new AppServicePlanListStep(suppressCreate)] };
    } else {
      return undefined;
    }
  }
}

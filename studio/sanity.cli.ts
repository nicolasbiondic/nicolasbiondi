import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'aqmgwuqn',
    dataset: 'production',
  },
  /**
   * Deploys the hosted Studio to https://nicolasbiondi.sanity.studio
   * Change `studioHost` if that name is taken.
   */
  studioHost: 'nicolasbiondi',
})
